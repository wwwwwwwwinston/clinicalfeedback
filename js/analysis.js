/* ============================================
   CLINIQ - Analysis & Feedback Summary JS
   ============================================ */

// --- Session Selector ---
function selectSession(id) {
  showNotification(`Loaded feedback summary for session: ${id.toUpperCase()}`, 'info');
}

// --- Submit All Sections ---
function submitAllSections() {
  const cards = document.querySelectorAll('.summary-action-card');
  let allConfirmed = true;
  cards.forEach(card => {
    const status = card.querySelector('.action-status .badge');
    if (!status || !status.classList.contains('badge-green')) {
      allConfirmed = false;
    }
  });
  if (!allConfirmed) {
    showNotification('Please confirm, edit, or reject all sections before submitting', 'error');
  } else {
    showNotification('All sections submitted - added to competency record', 'success');
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  // Any page-specific init
});
