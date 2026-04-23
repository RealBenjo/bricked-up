// Pops up the How To Play instructions
function showHowToPlay() {
  Swal.fire({
    title: 'How To Play',
    html: `
      In Bricked UP your goal is to destroy <b>ALL</b> of the bricks.<br><br>
      You also must <b>NOT</b> lose your balls, or else you will lose <b>1 HEALTH POINT</b>.
    `,
    icon: 'info',
    confirmButtonText: 'Got it!',
    confirmButtonColor: '#3085d6',
    background: '#2f2f2f', // Assuming a dark theme based on your previous code
    color: '#fff'
  });
}

// Pops up the info and gives them a button to actually open the editor
function showEditorPrompt() {
  Swal.fire({
    title: 'Level Editor',
    html: 'Want to make your own levels or change existing ones?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Open Level Editor',
    cancelButtonText: 'Not right now',
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#d33',
    background: '#2f2f2f',
    color: '#fff'
  }).then((result) => {
    // If they click "Open Level Editor", it fires your existing toggleEditor() function!
    if (result.isConfirmed) {
      if (typeof toggleEditor === "function") {
        toggleEditor();
      } else {
        console.warn("toggleEditor() function not found!");
      }
    }
  });
}