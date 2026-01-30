/* global Schnack */

window.Schnack = {
    init: function(options) {
        this.options = options;
        this.authenticated = false;
        this.user = null;
        this.page = window.location.pathname;
        this.getComments();
        this.ready();
    },

    ready: function() {
        var self = this;
        var form = document.querySelector('.schnack-form-comment');
        var textarea = document.querySelector('.schnack-comment');
        var charCount = document.querySelector('.char-count');

        // Add character counter event listener
        textarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });

        form.addEventListener('submit', function(ev) {
            ev.preventDefault();
            if (!self.authenticated) {
                self.login();
                return;
            }
            self.notify('pending');
            var formData = new FormData(form);
            formData.append('url', self.page);
            var xhr = new XMLHttpRequest();
            xhr.open('POST', self.options.post);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    self.notify('ok');
                    form.reset();
                    charCount.textContent = '0'; // Reset counter after submit
                    self.getComments();
                } else {
                    self.notify('error');
                }
            };
            xhr.send(formData);
        });
    },

    login: function() {
        var self = this;
        var width = 600;
        var height = 600;
        var left = (screen.width/2)-(width/2);
        var top = (screen.height/2)-(height/2);
        window.addEventListener('message', function(ev) {
            if (ev.data.schnack_user) {
                self.authenticated = true;
                self.user = ev.data.schnack_user;
                self.notify('ok', 'Welcome ' + self.user.name + '!');
                self.getComments();
            }
        }, false);
        window.open(
            this.options.login,
            '',
            'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+width+', height='+height+', top='+top+', left='+left
        );
    },

    notify: function(type, message) {
        var notification = document.querySelector('.schnack-notification-' + type);
        notification.style.display = 'block';
        if (message) notification.textContent = message;
        setTimeout(function() {
            notification.style.display = 'none';
        }, 3000);
    },

    getComments: function() {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this.options.get + '?url=' + encodeURIComponent(this.page));
        xhr.onload = function() {
            if (xhr.status === 200) {
                var comments = JSON.parse(xhr.responseText);
                self.renderComments(comments);
            }
        };
        xhr.send();
    },

    renderComments: function(comments) {
        var container = document.querySelector('.schnack-comments');
        container.innerHTML = '';
        comments.forEach(function(comment) {
            var commentEl = document.createElement('div');
            commentEl.className = 'schnack-comment';
            commentEl.innerHTML = `
                <div class="schnack-comment-header">
                    <strong>${comment.user.name}</strong>
                    <span>${new Date(comment.date).toLocaleString()}</span>
                </div>
                <div class="schnack-comment-body">${comment.text}</div>
            `;
            container.appendChild(commentEl);
        });
    }
};