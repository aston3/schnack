document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('schnack-comment');
    const submitButton = document.getElementById('schnack-submit');

    // Initialize button as disabled
    submitButton.disabled = true;

    // Listen for input events on textarea
    textarea.addEventListener('input', function() {
        // Check if textarea has content (after trimming whitespace)
        const hasContent = this.value.trim().length > 0;

        // Enable/disable button based on content
        submitButton.disabled = !hasContent;
    });
});