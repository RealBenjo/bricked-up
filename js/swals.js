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

// A helper constant for our local storage key
const LEADERBOARD_KEY = 'brickedUpLeaderboard';

// ==========================================
// 1. GAME OVER NAME PROMPT
// Call this function when the player loses! 
// e.g., inputPrompt(1250);
// ==========================================
function inputPrompt(finalScore) {
  Swal.fire({
    title: 'GAME OVER',
    html: `You scored <b>${finalScore}</b> points!<br>Enter your name to be recorded on the local leaderboard.`,
    input: 'text',
    inputPlaceholder: 'Enter your name...',
    icon: 'warning',
    allowOutsideClick: false, // Forces user to deal with the alert
    allowEscapeKey: false,    // Prevents pressing ESC to close
    confirmButtonText: 'Submit Score',
    confirmButtonColor: '#28a745',
    background: '#2f2f2f',
    color: '#fff',
    // Validate so they don't submit empty names
    inputValidator: (value) => {
      if (!value || value.trim() === '') {
        return 'You need to write a name!';
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Clean up the name string and limit it to 15 characters
      const playerName = result.value.trim().substring(0, 15);
      
      saveScore(playerName, finalScore);

      // Optional: Show the leaderboard immediately after they submit
      Swal.fire({
        title: 'Saved!',
        text: 'Your score has been added.',
        icon: 'success',
        background: '#2f2f2f',
        color: '#fff',
        confirmButtonColor: '#3085d6',
        timer: 1500, // auto-close after 1.5s
        showConfirmButton: false
      }).then(() => {
        showLeaderboard();
      });
    }
  });
}

// ==========================================
// 2. SAVING TO LOCAL STORAGE
// ==========================================
function saveScore(name, score) {
  // Grab existing scores from memory, or start an empty array if none exist
  let leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  
  // Add the new score
  leaderboard.push({ name: name, score: score });
  
  // Sort the array from Highest Score to Lowest Score
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep only the Top 10 scores
  leaderboard = leaderboard.slice(0, 10);
  
  // Save it back to Local Storage
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

// ==========================================
// 3. DISPLAY THE LEADERBOARD SWAL
// ==========================================
function showLeaderboard() {
  const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
  
  // We will build an HTML table string to inject into the Swal
  let htmlContent = '<div style="text-align: left; padding: 10px;">';
  
  if (leaderboard.length === 0) {
    htmlContent += '<h3 style="text-align: center; color: #aaa;">No scores yet.<br>Be the first!</h3>';
  } else {
    htmlContent += `
      <table style="width: 100%; border-collapse: collapse; font-size: 1.1em;">
        <tr style="border-bottom: 2px solid #555;">
          <th style="padding: 10px 5px; text-align: left;">Rank</th>
          <th style="padding: 10px 5px; text-align: left;">Name</th>
          <th style="padding: 10px 5px; text-align: right;">Score</th>
        </tr>
    `;
    
    // Loop through the data and build rows
    leaderboard.forEach((entry, index) => {
      let rank = index + 1;
      let medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      
      htmlContent += `
        <tr style="border-bottom: 1px solid #444;">
          <td style="padding: 10px 5px; font-weight: bold;">${medal}</td>
          <td style="padding: 10px 5px;">${entry.name}</td>
          <td style="padding: 10px 5px; text-align: right; color: #28a745; font-weight: bold;">${entry.score}</td>
        </tr>
      `;
    });
    
    htmlContent += '</table>';
  }
  
  htmlContent += '</div>';

  // Fire the Swal with our generated HTML table
  Swal.fire({
    title: 'LEADERBOARD',
    html: htmlContent,
    background: '#2f2f2f',
    color: '#fff',
    showCancelButton: true, // <-- CRITICAL: Tells Swal to render the second button!
    confirmButtonText: 'Awesome',
    confirmButtonColor: '#3085d6',
    cancelButtonText: 'Remove all scores',
    cancelButtonColor: '#df1515',
    width: '600px'
  }).then((result) => {
    // Check if they clicked the cancel button (our "Remove all scores" button)
    if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
      removeScores();
    }
  });
}

function removeScores() {
  // Use removeItem instead of clear() so you don't accidentally delete 
  // saved levels or settings later on down the line!
  localStorage.removeItem(LEADERBOARD_KEY);
  
  // Optional but nice: Show a success message, then immediately refresh the leaderboard
  Swal.fire({
    title: 'Deleted!',
    text: 'All scores have been wiped.',
    icon: 'success',
    background: '#2f2f2f',
    color: '#fff',
    confirmButtonColor: '#3085d6',
    timer: 1500, // Closes itself after 1.5 seconds
    showConfirmButton: false
  }).then(() => {
    // Open the leaderboard again so they can see it is empty
    showLeaderboard(); 
  });
}