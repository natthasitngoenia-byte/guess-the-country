// Single shared app state, imported by every UI module.
export const state = {
  mode: 'upload',      // 'upload' | 'webcam'
  image: null,         // data URL of the photo being analysed
  ready: false,        // in-browser face detector loaded
  aiAvailable: false,  // backend has Gemini turned on
  stream: null,        // active webcam MediaStream
};
