let myEditor = null;
let isEditorMode = false;

function toggleEditor() {
  const canvas = document.getElementById("canvas");
  
  if (!myEditor) {
    myEditor = new LevelEditor(canvas);
  }

  isEditorMode = !isEditorMode;

  if (isEditorMode) {
    Globals.engine.isRunning = false; // The engine stops drawing and processing
    myEditor.start(); // The editor takes over the canvas
  } else {
    myEditor.stop(); // The editor cleans up
    Globals.engine.isRunning = true; // The engine wakes back up instantly
  }
}