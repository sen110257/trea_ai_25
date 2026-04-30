import { defineStore } from 'pinia'

export const useHistoryStore = defineStore('history', {
  state: () => ({
    records: [],
    maxRecords: 50
  }),

  actions: {
    loadFromStorage() {
      try {
        const stored = localStorage.getItem('imageToolHistory')
        if (stored) {
          this.records = JSON.parse(stored)
        }
      } catch (e) {
        console.error('Failed to load history:', e)
      }
    },

    saveToStorage() {
      try {
        localStorage.setItem('imageToolHistory', JSON.stringify(this.records))
      } catch (e) {
        console.error('Failed to save history:', e)
      }
    },

    addRecord(record) {
      const newRecord = {
        id: Date.now().toString(),
        ...record,
        createdAt: new Date().toISOString()
      }

      this.records.unshift(newRecord)

      if (this.records.length > this.maxRecords) {
        this.records = this.records.slice(0, this.maxRecords)
      }

      this.saveToStorage()
    },

    removeRecord(id) {
      this.records = this.records.filter(r => r.id !== id)
      this.saveToStorage()
    },

    clearAll() {
      this.records = []
      this.saveToStorage()
    }
  }
})
