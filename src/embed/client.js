/* global Schnack, DOMPurify */

window.Schnack = {
    init: function(options) {
        this.options = options;
        this.authenticated = false;
        this.user = null;
        this.page = window.location.pathname;
        this.csrfToken = this.generateCSRFToken();
        this.getComments();
        this.ready();
        this.initDrafts();
        this.initMarkdownPreview();
    },

    generateCSRFToken: function() {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        document.cookie = `schnack_csrf=${token}; SameSite=Strict; path=/`;
        return token;
    },

    ready: function() {
        const self = this;
        const form = document.querySelector('.schnack-form-comment');
        const textarea = document.querySelector('.schnack-comment');
        const charCount = document.querySelector('.char-count');
        const preview = document.querySelector('.schnack-preview');
        const maxLength = 2000;

        // Character counter
        textarea.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = `${length}/${maxLength}`;
            charCount.className = `char-count ${length > maxLength ? 'char-count-error' : ''}`;
            localStorage.setItem('schnack_draft', this.value);
        });

        // Form submission
        form.addEventListener('submit', function(ev) {
            ev.preventDefault();
            if (!self.authenticated) return self.login();
            if (textarea.value.length > maxLength) {
                return self.notify('error', 'Comment exceeds maximum length');
            }
            
            self.notify('pending');
            const formData = new FormData(form);
            formData.append('url', self.page);
            formData.append('_csrf', self.csrfToken);

            fetch(self.options.post, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(response => {
                if (response.ok) {
                    self.notify('ok', 'Comment posted successfully');
                    form.reset();
                    localStorage.removeItem('schnack_draft');
                    charCount.textContent = `0/${maxLength}`;
                    self.getComments();
                } else {
                    throw new Error('Server error');
                }
            })
            .catch(err => {
                self.notify('error', 'Error posting comment');
                console.error(err);
            });
        });

        // Initialize auth status display
        this.updateAuthStatus();
    },

    initDrafts: function() {
        const draft = localStorage.getItem('schnack_draft');
        if (draft) {
            const textarea = document.querySelector('.schnack-comment');
            textarea.value = draft;
            textarea.dispatchEvent(new Event('input'));
        }
    },

    initMarkdownPreview: function() {
        const container = document.createElement('div');
        container.className = 'schnack-preview';
        document.querySelector('.schnack-form').appendChild(container);
        
        document.querySelector('.schnack-preview-toggle').addEventListener('click', function() {
            const textarea = document.querySelector('.schnack-comment');
            const preview = document.querySelector('.schnack-preview');
            if (this.dataset.mode === 'edit') {
                this.dataset.mode = 'preview';
                this.textContent = this.dataset.editText;
                preview.innerHTML = DOMPurify.sanitize(marked.parse(textarea.value));
                preview.style.display = 'block';
                textarea.style.display = 'none';
            } else {
                this.dataset.mode = 'edit';
                this.textContent = this.dataset.previewText;
                preview.style.display = 'none';
                textarea.style.display = 'block';
            }
        });
    },

    login: function() {
        const self = this;
        const width = 600;
        const height = 600;
        const left = (screen.width/2)-(width/2);
        const top = (screen.height/2)-(height/2);
        
        const authWindow = window.open(
            this.options.login,
            'schnack_auth',
            `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );

        const messageHandler = function(ev) {
            if (ev.origin !== new URL(self.options.host).origin) return;
            if (ev.data.schnack_user) {
                self.authenticated = true;
                self.user = ev.data.schnack_user;
                self.updateAuthStatus();
                self.notify('ok', `Welcome ${self.user.name}!`);
                self.getComments();
                window.removeEventListener('message', messageHandler);
            }
        };

        window.addEventListener('message', messageHandler, false);
    },

    updateAuthStatus: function() {
        const statusEl = document.querySelector('.schnack-auth-status');
        if (!statusEl) return;
        
        if (this.authenticated && this.user) {
            statusEl.innerHTML = this.options.partials.LoginStatus
                .replace('%USER%', this.user.name)
                .replace('%DISPLAY_NAME%', this.user.display_name);
        } else {
            statusEl.innerHTML = this.options.partials.SignInVia;
        }
    },

    notify: function(type, message) {
        const notification = document.querySelector(`.schnack-notification-${type}`);
        notification.textContent = message || notification.dataset.defaultText;
        notification.style.display = 'block';
        notification.setAttribute('aria-live', 'polite');
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
        
        // Focus for accessibility
        notification.focus();
    },

    getComments: function() {
        const self = this;
        fetch(`${this.options.get}?url=${encodeURIComponent(this.page)}`, {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(comments => {
            self.renderComments(comments);
        })
        .catch(err => {
            self.notify('error', 'Failed to load comments');
            console.error(err);
        });
    },

    renderComments: function(comments) {
        const container = document.querySelector('.schnack-comments');
        container.innerHTML = '';
        
        const buildComment = (comment, depth = 0) => {
            const commentEl = document.createElement('div');
            commentEl.className = `schnack-comment ${depth > 0 ? 'schnack-reply' : ''}`;
            commentEl.innerHTML = `
                <div class="schnack-comment-header">
                    <strong>${DOMPurify.sanitize(comment.user.name)}</strong>
                    <span>${new Date(comment.date).toLocaleString()}</span>
                    ${this.user && this.user.admin ? `
                        <button class="schnack-action" data-action="approve" data-id="${comment.id}">
                            <i class="icon schnack-icon-approve"></i>
                        </button>
                        <button class="schnack-action" data-action="reject" data-id="${comment.id}">
                            <i class="icon schnack-icon-reject"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="schnack-comment-body">${DOMPurify.sanitize(marked.parse(comment.text))}</div>
                ${comment.replies && comment.replies.length ? `
                    <div class="schnack-replies">
                        ${comment.replies.map(reply => buildComment(reply, depth + 1)).join('')}
                    </div>
                ` : ''}
                ${this.authenticated ? `
                    <button class="schnack-reply" data-reply-to="${comment.id}">
                        ${this.options.partials.Reply}
                    </button>
                ` : ''}
            `;
            return commentEl.outerHTML;
        };

        // Nest replies
        const nestComments = items => {
            const tree = [];
            const mapped = {};
            
            items.forEach(item => {
                mapped[item.id] = {...item, replies: []};
            });

            items.forEach(item => {
                if (item.reply_to && mapped[item.reply_to]) {
                    mapped[item.reply_to].replies.push(mapped[item.id]);
                } else {
                    tree.push(mapped[item.id]);
                }
            });

            return tree;
        };

        container.innerHTML = nestComments(comments).map(buildComment).join('');
        this.addCommentEventListeners();
    },

    addCommentEventListeners: function() {
        document.querySelectorAll('[data-action="approve"], [data-action="reject"]').forEach(btn => {
            btn.addEventListener('click', e => {
                const action = e.target.closest('button').dataset.action;
                const id = e.target.closest('button').dataset.id;
                this.moderateComment(id, action);
            });
        });

        document.querySelectorAll('.schnack-reply').forEach(btn => {
            btn.addEventListener('click', e => {
                const replyTo = e.target.closest('button').dataset.replyTo;
                this.startReply(replyTo);
            });
        });
    },

    moderateComment: function(id, action) {
        fetch(`${this.options.host}/comment/${id}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                this.notify('ok', `Comment ${action}d successfully`);
                this.getComments();
            } else {
                throw new Error('Moderation failed');
            }
        })
        .catch(err => {
            this.notify('error', `Error ${action}ing comment`);
            console.error(err);
        });
    },

    startReply: function(replyToId) {
        const textarea = document.querySelector('.schnack-comment');
        const user = document.querySelector(`[data-id="${replyToId}] .schnack-comment-header strong`).textContent;
        textarea.value = `@${user} `;
        textarea.focus();
        localStorage.setItem('schnack_draft', textarea.value);
        textarea.dispatchEvent(new Event('input'));
    }
};