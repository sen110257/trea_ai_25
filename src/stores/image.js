import { defineStore } from 'pinia'

export const useImageStore = defineStore('image', {
  state: () => ({
    globalImage: null,
    globalImageName: null,
    globalImageFileSize: null,
    
    originalImage: null,
    processedImage: null,
    history: [],
    historyIndex: -1,
    maxHistorySize: 20
  }),

  getters: {
    hasGlobalImage: (state) => !!state.globalImage
  },

  actions: {
    setGlobalImage(imageData, name = null, fileSize = null) {
      this.globalImage = imageData
      this.globalImageName = name
      this.globalImageFileSize = fileSize
    },

    clearGlobalImage() {
      this.globalImage = null
      this.globalImageName = null
      this.globalImageFileSize = null
    },

    setOriginalImage(imageData) {
      this.originalImage = imageData
      this.processedImage = imageData
      this.clearHistory()
      this.saveToHistory()
    },

    setProcessedImage(imageData) {
      this.processedImage = imageData
    },

    saveToHistory() {
      if (this.processedImage) {
        if (this.historyIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.historyIndex + 1)
        }
        
        this.history.push(JSON.stringify(this.processedImage))
        
        if (this.history.length > this.maxHistorySize) {
          this.history.shift()
        } else {
          this.historyIndex++
        }
      }
    },

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--
        this.processedImage = JSON.parse(this.history[this.historyIndex])
        return true
      }
      return false
    },

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++
        this.processedImage = JSON.parse(this.history[this.historyIndex])
        return true
      }
      return false
    },

    reset() {
      if (this.originalImage) {
        this.processedImage = this.originalImage
        this.clearHistory()
        this.saveToHistory()
      }
    },

    clearHistory() {
      this.history = []
      this.historyIndex = -1
    },

    clearAll() {
      this.originalImage = null
      this.processedImage = null
      this.clearHistory()
    }
  }
})
