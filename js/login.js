// ── NETLIFY IDENTITY TOKEN INTERCEPT ──
(function() {
  if (!window.location.hash) return;
  var params = new URLSearchParams(window.location.hash.substring(1));
  var inviteToken   = params.get('invite_token');
  var recoveryToken = params.get('recovery_token');
  if (inviteToken) {
    window.location.replace('/members/welcome.html#invite_token=' + inviteToken);
  } else if (recoveryToken) {
    window._recoveryToken = recoveryToken;
    history.replaceState(null, '', window.location.pathname);
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('login-form').style.display = 'none';
      var hero = document.querySelector('.login-card-hero');
      if (hero) {
        hero.querySelector('.login-card-title').textContent = 'Reset your password.';
        hero.querySelector('.login-card-sub').textContent = 'Choose a new password for your Human Unity account.';
      }
      var msgEl = document.getElementById('login-msg');
      if (msgEl) {
        msgEl.insertAdjacentHTML('beforebegin',
          '<form id="reset-form" action="javascript:void(0)" onsubmit="handleReset(event)" style="display:flex;flex-direction:column;gap:1rem">' +
          '<div class="field-group"><label class="field-label">New password</label>' +
          '<input class="field-input" type="password" id="reset-password" placeholder="At least 8 characters" required minlength="8"></div>' +
          '<button type="submit" class="login-btn" id="reset-btn">Set new password \u2192</button></form>'
        );
      }
    });
  }
})();

// ── Netlify Identity ──
netlifyIdentity.on('init', function(user) {
  if (user) window.location.href = '/members/dashboard.html';
});
netlifyIdentity.on('login', function() {
  window.location.href = '/members/dashboard.html';
});
netlifyIdentity.init({ logo: false });

// ── Helpers ──
function showMsg(text, type) {
  var el = document.getElementById('login-msg');
  el.textContent = text;
  el.className = 'login-msg ' + type;
  el.style.display = 'block';
}
function clearMsg() {
  document.getElementById('login-msg').style.display = 'none';
}

// ── Login ──
function handleLogin(e) {
  e.preventDefault();
  clearMsg();
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var btn      = document.getElementById('login-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  netlifyIdentity.gotrue.login(email, password, true).then(function(user) {
    // Redirect directly — don't wait for the 'login' event which can be unreliable
    window.location.href = '/members/dashboard.html';
  }).catch(function(err) {
    btn.classList.remove('loading');
    btn.disabled = false;
    var msg = (err && err.message) ? err.message : '';
    if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('failed')) {
      showMsg('Incorrect email or password. Please try again.', 'error');
    } else if (msg.toLowerCase().includes('confirm')) {
      showMsg('Please confirm your email before signing in — check your inbox.', 'error');
    } else {
      showMsg(msg || 'Something went wrong. Please try again.', 'error');
    }
  });
}

// ── Forgot password ──
document.addEventListener('DOMContentLoaded', function() {
  var forgotLink = document.getElementById('forgot-link');
  if (!forgotLink) return;
  forgotLink.addEventListener('click', function(e) {
    e.preventDefault();
    clearMsg();
    var email = document.getElementById('email').value.trim();
    if (!email) {
      showMsg('Enter your email address above first.', 'error');
      document.getElementById('email').focus();
      return;
    }
    netlifyIdentity.gotrue.requestPasswordRecovery(email).then(function() {
      var el = document.getElementById('login-msg');
      el.style.background = 'var(--teal-light)';
      el.style.borderColor = 'rgba(42,191,163,0.3)';
      el.style.color = 'var(--teal-dark)';
      el.textContent = 'Recovery email sent — check your inbox.';
      el.style.display = 'block';
    }).catch(function() {
      showMsg('Could not send recovery email. Contact hello@humanunity.us', 'error');
    });
  });
});

// ── Password reset handler ──
function handleReset(e) {
  e.preventDefault();
  var password = document.getElementById('reset-password').value;
  var btn = document.getElementById('reset-btn');
  btn.classList.add('loading');
  btn.disabled = true;
  netlifyIdentity.gotrue.recover(window._recoveryToken, true).then(function() {
    return netlifyIdentity.gotrue.currentUser().update({ password: password });
  }).then(function() {
    showMsg('Password updated — signing you in\u2026', 'success');
    setTimeout(function() { window.location.href = '/members/dashboard.html'; }, 1500);
  }).catch(function(err) {
    btn.classList.remove('loading');
    btn.disabled = false;
    showMsg((err && err.message) || 'Could not reset password. Try again.', 'error');
  });
}
