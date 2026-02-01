package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections for local network access
	},
}

type SystemStats struct {
	OS          string  `json:"os"`
	Uptime      uint64  `json:"uptime"`
	CPUPercent  float64 `json:"cpu_percent"`
	MemPercent  float64 `json:"mem_percent"`
	MemTotal    uint64  `json:"mem_total"`
	MemUsed     uint64  `json:"mem_used"`
	NetSent     uint64  `json:"net_sent"`
	NetRecv     uint64  `json:"net_recv"`
}

func getStats() SystemStats {
	v, _ := mem.VirtualMemory()
	c, _ := cpu.Percent(0, false)
	h, _ := host.Info()
	n, _ := net.IOCounters(false)

	cpuVal := 0.0
	if len(c) > 0 {
		cpuVal = c[0]
	}

	netSent := uint64(0)
	netRecv := uint64(0)
	if len(n) > 0 {
		netSent = n[0].BytesSent
		netRecv = n[0].BytesRecv
	}

	return SystemStats{
		OS:         runtime.GOOS,
		Uptime:     h.Uptime,
		CPUPercent: cpuVal,
		MemPercent: v.UsedPercent,
		MemTotal:   v.Total,
		MemUsed:    v.Used,
		NetSent:    netSent,
		NetRecv:    netRecv,
	}
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected")
	
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		stats := getStats()
		err := conn.WriteJSON(stats)
		if err != nil {
			log.Println("Write error:", err)
			break
		}
	}
}

func main() {
	// Create web directory if it doesn't exist
	if _, err := os.Stat("web"); os.IsNotExist(err) {
		os.Mkdir("web", 0755)
	}

	fs := http.FileServer(http.Dir("./web"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", wsHandler)

	port := "8080"
	fmt.Printf("TeleLite Host Running!\n")
	fmt.Printf("1. Ensure your phone and laptop are on the SAME WiFi.\n")
	fmt.Printf("2. Find your laptop's IP (e.g., 192.168.1.5).\n")
	fmt.Printf("3. Open http://YOUR_LAPTOP_IP:%s in Chrome on Android.\n", port)
	
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
