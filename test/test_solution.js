const assert = require('assert');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

describe('Comment Submit Button', function() {
    let dom;
    let textarea;
    let submitButton;

    beforeEach(() => {
        const html = `
            <!DOCTYPE html>
            <html>
            <body>
                <textarea id="schnack-comment"></textarea>
                <button type="submit" id="schnack-submit">Post comment</button>
                <script src="../src/embed/client.js"></script>
            </body>
            </html>
        `;

        dom = new JSDOM(html);
        global.document = dom.window.document;
        global.window = dom.window;

        // Re-require the client.js to load in the test environment
        require('../src/embed/client.js');

        textarea = document.getElementById('schnack-comment');
        submitButton = document.getElementById('schnack-submit');
    });

    it('should be disabled by default', function() {
        assert.strictEqual(submitButton.disabled, true);
    });

    it('should enable when textarea has content', function() {
        textarea.value = 'Test comment';
        const event = new dom.window.Event('input');
        textarea.dispatchEvent(event);

        assert.strictEqual(submitButton.disabled, false);
    });

    it('should disable when textarea is empty', function() {
        textarea.value = 'Test comment';
        let event = new dom.window.Event('input');
        textarea.dispatchEvent(event);

        // Now clear the textarea
        textarea.value = '';
        event = new dom.window.Event('input');
        textarea.dispatchEvent(event);

        assert.strictEqual(submitButton.disabled, true);
    });

    it('should ignore whitespace-only content', function() {
        textarea.value = '   ';
        const event = new dom.window.Event('input');
        textarea.dispatchEvent(event);

        assert.strictEqual(submitButton.disabled, true);
    });
});