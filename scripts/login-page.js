(() => {
  const $ = id => document.getElementById(id);
  const form = $('auth-form');
  const emailInput = $('auth-email');
  const passwordInput = $('auth-password');
  const message = $('auth-message');
  const submit = $('auth-submit');
  const title = $('auth-title');
  const tabs = $('auth-tabs');
  const emailField = $('auth-email-field');
  const usernameField = $('auth-username-field');
  const usernameInput = $('auth-username');
  const codeField = $('auth-code-field');
  const codeInput = $('auth-code');
  const forgotBtn = $('auth-forgot');
  const resendBtn = $('auth-resend');
  const langBtn = $('auth-lang');
  const socialBox = $('auth-social');
  const socialDivider = $('auth-divider');
  const googleBtn = $('auth-google');
  const githubBtn = $('auth-github');
  const minPasswordLength = window.siteAuth.minimumPasswordLength || 12;

  let mode = 'signin';     // 'signin' | 'signup'
  let recovery = false;    // 从重置密码邮件链接进来
  let awaitingCode = false;
  let lang = (() => { try { const saved = localStorage.getItem('site-language'); return ['zh','en','ja'].includes(saved) ? saved : 'zh'; } catch (_) { return 'zh'; } })();

  const I18N = {
    zh: {
      backHome: '返回首页　↗', tabSignin: '登录', tabSignup: '注册',
      continueGoogle: '使用 Google 继续', continueGithub: '使用 GitHub 继续', orEmail: '或使用邮箱',
      privacyLink: '隐私政策与数据处理说明 ↗',
      username: '用户名', emailOrUsername: '邮箱 / 用户名', email: '邮箱地址', password: '密码', verificationCode: '邮箱验证码',
      titleSignin: '登录', titleSignup: '注册', titleRecovery: '设置新密码',
      enter: '登录', create: '发送验证码', verify: '验证并创建账号', save: '保存新密码',
      signingIn: '登录中…', creating: '创建中…', saving: '保存中…',
      forgot: '忘记密码？', resend: '重新发送确认邮件',
      placeholderPwd: '至少 12 位', placeholderPwdSignin: '你的密码',
      highRisk: '这台设备在 24 小时内注册了多个账号，这个账号的收藏和偏好同步暂时受限。',
      needConfirm: '验证码已发送到你的邮箱，请输入邮件中的 6 位数字完成注册。',
      resendOk: '确认邮件已重发，去收件箱看看。',
      resetSent: '重置密码的邮件已发送，去查收。',
      pwdUpdated: '密码已改好，正在回主页…',
      signedIn: '成功，正在回主页…',
      errEmail: '请填写邮箱或用户名', errEmailFormat: '请输入有效的邮箱地址', errUsername: '用户名要 4–9 位，只能用字母、数字、下划线和短横线', errCode: '请输入邮件中的 6 位验证码', errPwd: '新密码至少需要 12 位',
      recoveryOk: '链接已生效，设个新密码吧',
      oauthNoRedirect: '登录跳转没有完成，请检查网络或稍后重试。按钮已恢复，可以重新选择登录方式。'
    },
    en: {
      backHome: 'Back to home ↗', tabSignin: 'Sign in', tabSignup: 'Sign up',
      continueGoogle: 'Continue with Google', continueGithub: 'Continue with GitHub', orEmail: 'OR USE EMAIL',
      privacyLink: 'Privacy Policy and Data Processing ↗',
      username: 'Username', emailOrUsername: 'Email / username', email: 'Email address', password: 'Password', verificationCode: 'Email code',
      titleSignin: 'Sign in', titleSignup: 'Sign up', titleRecovery: 'Set a new password',
      enter: 'Sign in', create: 'Send code', verify: 'Verify & create account', save: 'Save password',
      signingIn: 'Signing in…', creating: 'Creating…', saving: 'Saving…',
      forgot: 'Forgot password?', resend: 'Resend confirmation email',
      placeholderPwd: 'At least 12 characters', placeholderPwdSignin: 'Your password',
      highRisk: 'Multiple accounts were created from this device within 24 hours, so bookmark and preference sync is temporarily limited.',
      needConfirm: 'A 6-digit code has been sent to your email. Enter it to finish creating your account.',
      resendOk: 'Confirmation email sent again — check your inbox.',
      resetSent: 'Password reset email sent — check your inbox.',
      pwdUpdated: 'Password updated. Heading back…',
      signedIn: 'Signed in. Heading back…',
      errEmail: 'Enter your email or username',
      errEmailFormat: 'Enter a valid email address',
      errUsername: 'Username needs 4–9 characters: letters, numbers, _ or -',
      errCode: 'Enter the 6-digit code from your email',
      errPwd: 'New passwords need at least 12 characters',
      recoveryOk: 'Link accepted — set a new password.',
      oauthNoRedirect: 'The sign-in page did not open. Check your connection and try again; the buttons are ready to use.'
    },
    ja: {
      backHome: 'ホームへ戻る ↗', tabSignin: 'ログイン', tabSignup: '新規登録',
      continueGoogle: 'Google で続行', continueGithub: 'GitHub で続行', orEmail: 'またはメールアドレス',
      privacyLink: 'プライバシーポリシー ↗',
      username: 'ユーザー名', emailOrUsername: 'メール / ユーザー名', email: 'メールアドレス', password: 'パスワード', verificationCode: '確認コード',
      titleSignin: 'ログイン', titleSignup: '新規登録', titleRecovery: '新しいパスワード',
      enter: 'ログイン', create: '確認コードを送信', verify: '確認して登録', save: '保存',
      signingIn: 'ログイン中…', creating: '登録中…', saving: '保存中…',
      forgot: 'パスワードを忘れた場合', resend: '確認メールを再送',
      placeholderPwd: '12文字以上', placeholderPwdSignin: 'パスワードを入力',
      highRisk: 'この端末で短時間に複数の登録が行われたため、同期が一時的に制限されています。',
      needConfirm: 'メールに6桁の確認コードを送信しました。入力して登録を完了してください。',
      resendOk: '確認メールを再送しました。受信箱をご確認ください。',
      resetSent: 'パスワード再設定メールを送信しました。',
      pwdUpdated: 'パスワードを更新しました。ホームに戻ります…',
      signedIn: 'ログインしました。ホームに戻ります…',
      errEmail: 'メールアドレスまたはユーザー名を入力してください', errEmailFormat: '有効なメールアドレスを入力してください',
      errUsername: 'ユーザー名は4〜9文字です。英字・数字・_・- が使えます', errCode: 'メールに届いた6桁のコードを入力してください', errPwd: '新しいパスワードは12文字以上にしてください',
      recoveryOk: 'リンクを確認しました。新しいパスワードを設定してください。',
      oauthNoRedirect: 'ログイン画面へ移動できませんでした。通信を確認して再試行してください。'
    }
  };

  const t = key => (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;

  const show = (text, ok) => {
    message.textContent = text || '';
    message.hidden = !text;
    message.classList.toggle('is-ok', !!ok);
  };

  const applyLang = () => {
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'ja' ? 'ja' : 'zh-CN';
    try { localStorage.setItem('site-language', lang); } catch (_) {}
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    langBtn.textContent = lang === 'zh' ? 'EN' : lang === 'en' ? '日本語' : '中文';
    render();
  };

  langBtn.addEventListener('click', () => { lang = lang === 'zh' ? 'en' : lang === 'en' ? 'ja' : 'zh'; applyLang(); });

  const submitLabel = () => {
    if (recovery) return t('save');
    if (mode === 'signup' && awaitingCode) return t('verify');
    return mode === 'signup' ? t('create') : t('enter');
  };

  const render = () => {
    if (recovery) {
      title.textContent = t('titleRecovery');
      emailField.hidden = true;
      usernameField.hidden = true;
      codeField.hidden = true;
      tabs.hidden = true;
      socialBox.hidden = true;
      socialDivider.hidden = true;
      passwordInput.setAttribute('autocomplete', 'new-password');
      passwordInput.placeholder = t('placeholderPwd');
      forgotBtn.hidden = true;
    } else {
      title.textContent = mode === 'signup' ? t('titleSignup') : t('titleSignin');
      emailField.hidden = false;
      emailField.querySelector('label').textContent = mode === 'signup' ? t('email') : t('emailOrUsername');
      emailInput.type = mode === 'signup' ? 'email' : 'text';
      emailInput.placeholder = mode === 'signup' ? 'name@example.com' : (lang === 'en' ? 'Email or username' : lang === 'ja' ? 'メールアドレスまたはユーザー名' : '邮箱地址或用户名');
      usernameField.hidden = mode !== 'signup';
      codeField.hidden = !(mode === 'signup' && awaitingCode);
      tabs.hidden = false;
      socialBox.hidden = false;
      socialDivider.hidden = false;
      passwordInput.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
      passwordInput.placeholder = mode === 'signup' ? t('placeholderPwd') : t('placeholderPwdSignin');
      forgotBtn.hidden = mode === 'signup';
    }
    if (!submit.disabled) submit.textContent = submitLabel();
  };

  tabs.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      tabs.querySelectorAll('.auth-tab').forEach(other => {
        const on = other === tab;
        other.classList.toggle('is-active', on);
        other.setAttribute('aria-selected', String(on));
      });
      show('');
      render();
    });
  });

  forgotBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) return show(t('errEmail'));
    if (!email.includes('@')) return show(t('errEmailFormat'));
    try {
      await window.siteAuth.requestReset(email);
      show(t('resetSent'), true);
    } catch (error) {
      show(error && error.message ? error.message : '出了点问题，再试一次');
    }
  });

  resendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) return show(t('errEmail'));
    resendBtn.disabled = true;
    try {
      await window.siteAuth.resendConfirmation(email);
      show(t('resendOk'), true);
    } catch (error) {
      show(error && error.message ? error.message : '出了点问题，再试一次');
    }
    resendBtn.disabled = false;
  });

  let socialWatchdog = null;
  const resetSocialButtons = () => {
    if (socialWatchdog) { clearTimeout(socialWatchdog); socialWatchdog = null; }
    googleBtn.disabled = false;
    githubBtn.disabled = false;
  };
  // OAuth 页面可能被浏览器保存在 BFCache；取消授权返回时必须恢复按钮状态。
  window.addEventListener('pageshow', resetSocialButtons);
  window.addEventListener('pagehide', () => { resetSocialButtons(); });

  const startSocialLogin = async provider => {
    show('');
    const startedAtUrl = location.href;
    googleBtn.disabled = true;
    githubBtn.disabled = true;
    try {
      await window.siteAuth.signInWithOAuth(provider, mode === 'signup' ? 'signup' : 'signin');
      // 如果浏览器拦截跳转、网络异常或授权地址没有真正打开，不能让按钮永久禁用。
      socialWatchdog = setTimeout(() => {
        if (location.href === startedAtUrl && document.visibilityState === 'visible') {
          resetSocialButtons();
          show(t('oauthNoRedirect'), false);
        }
      }, 15000);
    } catch (error) {
      resetSocialButtons();
      show(error && error.message ? error.message : '第三方登录暂时不可用，请稍后再试');
    }
  };
  googleBtn.addEventListener('click', () => startSocialLogin('google'));
  githubBtn.addEventListener('click', () => startSocialLogin('github'));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    show('');

    if (recovery) {
      const password = passwordInput.value;
      if (password.length < minPasswordLength) return show(t('errPwd'));
      submit.disabled = true;
      submit.textContent = t('saving');
      try {
        await window.siteAuth.updatePassword(password);
        show(t('pwdUpdated'), true);
        setTimeout(() => { location.href = './index.html'; }, 900);
      } catch (error) {
        show(error && error.message ? error.message : '出了点问题，再试一次');
        submit.disabled = false;
        render();
      }
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email) return show(t('errEmail'));

    if (mode === 'signin') {
      if (!email.includes('@') && !window.siteAuth.usernamePattern.test(email)) return show(t('errEmailFormat'));
      if (password.length < minPasswordLength) return show(t('errPwd'));
    } else if (!awaitingCode) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show(t('errEmailFormat'));
      if (!window.siteAuth.usernamePattern.test(usernameInput.value.trim())) return show(t('errUsername'));
      if (password.length < 6) return show(t('errPwd'));
    } else if (!/^\d{6}$/.test(codeInput.value.trim())) {
      return show(t('errCode'));
    }

    submit.disabled = true;
    submit.textContent = mode === 'signup' && awaitingCode ? t('verify') : (mode === 'signup' ? t('creating') : t('signingIn'));
    try {
      let payload;
      if (mode === 'signup' && awaitingCode) {
        payload = await window.siteAuth.verifySignupOtp({ email, token: codeInput.value.trim() });
      } else if (mode === 'signup') {
        payload = await window.siteAuth.signUp({ email, password, username: usernameInput.value.trim() });
        if (payload.needConfirm) {
          awaitingCode = true;
          show(t('needConfirm'), true);
          submit.disabled = false;
          render();
          codeInput.focus();
          return;
        }
      } else {
        payload = await window.siteAuth.signIn({ email, password });
      }

      // 只有新账号注册完成后才登记风控；普通登录绝不能增加注册计数。
      if (mode === 'signup' && window.siteRisk) {
        try {
          await window.siteRisk.record(payload.userId, payload.username);
          await window.siteRisk.evaluate();
        } catch (_) {}
        if (window.siteRisk.highRisk) {
          show(t('highRisk'), false);
          submit.disabled = false;
          render();
          return;
        }
      }
      show(t('signedIn'), true);
      setTimeout(() => { location.href = './index.html'; }, 700);
    } catch (error) {
      show(error && error.message ? error.message : '出了点问题，再试一次');
      submit.disabled = false;
      render();
    }
  });

  // 页面加载：先接住邮件链接里带回来的令牌
  window.siteAuth.restore().then(async account => {
    const oauth = window.siteAuth.redirect || {};
    if (oauth.error) show(oauth.error, false);
    if (account && oauth.isNewUser && window.siteRisk) {
      try {
        await window.siteRisk.record(account.id, account.username);
        await window.siteRisk.evaluate();
        if (window.siteRisk.highRisk) {
          show(t('highRisk'), false);
          return;
        }
      } catch (_) {}
    }
    let kind = window.siteAuth.redirect && window.siteAuth.redirect.type;
    if (!kind) {
      try { kind = sessionStorage.getItem('site-auth-redirect'); } catch (_) {}
    }
    if (kind) { try { sessionStorage.removeItem('site-auth-redirect'); } catch (_) {} }
    if (kind === 'recovery') {
      recovery = true;
      render();
      show(t('recoveryOk'), true);
      passwordInput.focus();
      return;
    }
    if (window.siteRisk) {
      window.siteRisk.status().then(risk => {
        if (risk) show(t('highRisk'), false);
      });
    }
    if (account && (account.username || account.email)) location.replace('./index.html');
  });

  applyLang();
})();
