// Login page enhancer - matches reference design exactly
// Use global variable for restoration
if (!window.jawwalpayOriginalLoginBodyContent) {
  window.jawwalpayOriginalLoginBodyContent = null;
}

function enhanceLoginPage() {
  try {
    const loginForm = document.querySelector('#loginForm');
    if (!loginForm) {
      console.log('[JawwalPay UX+] Login form not found, skipping enhancement');
      return;
    }

    console.log('[JawwalPay UX+] Rebuilding login page to match reference design...');

    // Save original body content before modifying
    if (!window.jawwalpayOriginalLoginBodyContent) {
      window.jawwalpayOriginalLoginBodyContent = document.body.innerHTML;
      console.log('[JawwalPay UX+] Saved original login body content to window variable');
    }

    // Extract login error messages
    const loginMessage = document.querySelector('.login_message');
    let errorMessage = '';
    if (loginMessage) {
      errorMessage = loginMessage.textContent.trim();
      console.log('[JawwalPay UX+] Found login error message:', errorMessage);
    }

    // Extract form attributes and values
    const formAction = loginForm.getAttribute('action') || 'https://business.jawwalpay.ps/login/authenticate';
    const formMethod = loginForm.getAttribute('method') || 'post';
    const formName = loginForm.getAttribute('name') || 'loginForm';
    const formId = loginForm.getAttribute('id') || 'loginForm';

    // Extract all form fields to preserve hidden fields, CSRF tokens, etc.
    const allFormFields = [];
    loginForm.querySelectorAll('input, textarea, select').forEach(field => {
      allFormFields.push({
        name: field.getAttribute('name'),
        value: field.value,
        type: field.getAttribute('type'),
        id: field.getAttribute('id')
      });
    });
    
    console.log('[JawwalPay UX+] Preserving form fields:', allFormFields);

    // Extract input values if they exist
    const usernameInput = loginForm.querySelector('input[name="username"]');
    const passwordInput = loginForm.querySelector('input[name="password"]');
    const usernameValue = usernameInput ? usernameInput.value : '';
    const passwordValue = passwordInput ? passwordInput.value : '';

    // Asset URLs
    const qrImg = 'https://business.jawwalpay.ps/assets/jawwalpayQR-ab7ec7ca050e0e59c78cfee6a47e3763.svg';
    const androidLink = 'https://play.google.com/store/apps/details?id=ps.jawwalPay.customer&hl=en';
    const appleLink = 'https://apps.apple.com/us/app/jawwal-pay/id1495191874';
    const forgotPasswordLink = 'https://business.jawwalpay.ps/login/auth#';
    const phoneLink = 'tel:1177';
    const websiteLink = 'https://www.jawwalpay.ps/';
    const facebookLink = 'https://www.facebook.com/JawwalPay';
    const twitterLink = 'https://twitter.com/JawwalPay';
    const instagramLink = 'https://www.instagram.com/jawwalpay/';
    const langLink = 'https://business.jawwalpay.ps/login/auth';

    // Clear the entire page body and rebuild
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = '"Cairo", "Segoe UI", Tahoma, sans-serif';
    document.body.style.color = '#15262a';
    document.body.style.background = '#0e2f2d';
    document.body.style.minHeight = '100vh';
    document.body.style.overflow = 'auto';
    
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(viewport);
    }
    
    // Remove any conflicting styles from original site
    document.documentElement.style.overflow = 'auto';
    
    // Remove all external stylesheets that might interfere
    const allLinks = document.querySelectorAll('link[rel="stylesheet"]');
    allLinks.forEach(link => link.remove());
    
    // Remove all existing style tags from original site
    const allStyles = document.querySelectorAll('style');
    allStyles.forEach(style => style.remove());
    
    // Add a comprehensive CSS reset to override original site CSS
    const resetStyle = document.createElement('style');
    resetStyle.textContent = `
      * { box-sizing: border-box !important; }
      body { margin: 0 !important; padding: 0 !important; }
      html, body { height: auto !important; overflow: auto !important; }
      body { -webkit-font-smoothing: antialiased !important; }
      a { color: inherit !important; text-decoration: none !important; }
      button { font-family: inherit !important; }
      img { max-width: none !important; }
      .hero__bg { background-image: linear-gradient(160deg, rgba(10,40,38,.92) 0%, rgba(15,60,57,.72) 38%, rgba(23,110,104,.55) 68%, rgba(43,150,140,.55) 100%) !important; }
    `;
    document.head.appendChild(resetStyle);

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box !important; }
      html, body { height: 100% !important; }
      body { margin: 0 !important; -webkit-font-smoothing: antialiased !important; }
      a { color: inherit !important; text-decoration: none !important; }
      button { font-family: inherit !important; }
      
      .stripe {
        height: 4px;
        width: 100%;
        background: linear-gradient(90deg, #77bc23, #4bb2ae 45%, #1f7a73);
        position: fixed;
        top: 0; right: 0; left: 0;
        z-index: 50;
      }
      
      .app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      
      .stage {
        flex: 1;
        display: flex;
        min-height: 100vh;
      }
      
      .hero {
        position: relative;
        flex: 1.15;
        min-width: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 48px 56px 40px;
        color: #fff !important;
        background-color: #0e2f2d !important;
        background-image: linear-gradient(160deg, rgba(10,40,38,0.85) 0%, rgba(15,60,57,0.65) 38%, rgba(23,110,104,0.5) 68%, rgba(43,150,140,0.5) 100%), url("https://i.imgur.com/FSMOTOv.jpeg") !important;
        background-size: cover !important;
        background-position: center 20% !important;
      }
      
      .hero__bg {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background-image: linear-gradient(160deg, rgba(10,40,38,0.92) 0%, rgba(15,60,57,0.72) 38%, rgba(23,110,104,0.55) 68%, rgba(43,150,140,0.55) 100%) !important;
        background-size: cover !important;
        background-position: center 20% !important;
        z-index: 0 !important;
        min-height: 100% !important;
      }
      
      .hero__top { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 18px; color: #fff !important; }
      
      .brandmark { display: flex; align-items: center; gap: 14px; color: #fff !important; }
      .brandmark__logo { width: 52px; height: 52px; flex-shrink: 0; filter: drop-shadow(0 6px 14px rgba(0,0,0,.25)); }
      .brandmark__name { font-size: 20px; font-weight: 800; letter-spacing: .2px; color: #fff !important; }
      .brandmark__tag { font-size: 12px; color: #e4f5f3 !important; opacity: .85; margin-top: 2px; }
      
      .lang-pill {
        display: flex; align-items: center; gap: 8px;
        border: 1px solid rgba(255,255,255,.35);
        background: rgba(255,255,255,.08);
        backdrop-filter: blur(6px);
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        transition: background .2s ease, border-color .2s ease;
        color: #fff !important;
      }
      .lang-pill:hover { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.6); }
      
      .hero__mid { position: relative; z-index: 2; max-width: 480px; margin-top: auto; margin-bottom: auto; color: #fff !important; }
      .hero__eyebrow {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 12.5px; font-weight: 700; letter-spacing: .4px;
        color: #a9d97a !important;
        margin-bottom: 18px;
      }
      .hero__eyebrow::before { content: ""; width: 22px; height: 2px; background: #77bc23; display: inline-block; border-radius: 2px; }
      .hero__title { font-size: 38px; line-height: 1.32; font-weight: 800; margin: 0 0 16px; color: #fff !important; }
      .hero__desc { font-size: 15.5px; line-height: 1.9; color: #e4f5f3 !important; opacity: .92; margin: 0; }
      
      .hero__bottom { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; color: #fff !important; }
      .store-row { display: flex; align-items: center; gap: 10px; color: #fff !important; }
      .store-label { font-size: 12.5px; font-weight: 600; color: #e4f5f3 !important; margin-left: 2px; }
      .store-badge {
        display: flex; align-items: center; justify-content: center;
        width: 44px; height: 44px;
        border-radius: 12px;
        background: rgba(255,255,255,.12);
        border: 1px solid rgba(255,255,255,.28);
        backdrop-filter: blur(6px);
        transition: transform .18s ease, background .18s ease;
      }
      .store-badge:hover { transform: translateY(-3px); background: rgba(255,255,255,.22); }
      .store-badge svg { width: 20px; height: 20px; }
      .store-badge.android svg { width: 22px; height: 18px; }
      
      .qr-card {
        display: flex; align-items: center; gap: 12px;
        background: rgba(255,255,255,.95);
        color: #15262a;
        padding: 10px 14px;
        border-radius: 16px;
        box-shadow: 0 14px 30px -12px rgba(0,0,0,.4);
      }
      .qr-card img { width: 56px; height: 56px; border-radius: 6px; display: block; }
      .qr-card__text { font-size: 11.5px; line-height: 1.5; font-weight: 700; color: #1f7a73; }
      .qr-card__text span { display: block; font-weight: 500; color: #4d6265; font-size: 11px; }
      
      .auth {
        flex: 1;
        max-width: 560px;
        background: #ffffff !important;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        position: relative;
      }
      .auth-card { width: 100%; max-width: 380px; }
      
      .auth-icon {
        width: 60px; height: 60px;
        border-radius: 18px;
        background: linear-gradient(145deg, #e4f5f3, #ffffff);
        border: 1px solid #a9dcd8;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 26px;
      }
      .auth-icon svg { width: 28px; height: 28px; }
      
      .auth-card h2 {
        font-size: 26px;
        font-weight: 800;
        margin: 0 0 8px;
        color: #15262a !important;
      }
      .auth-card__sub {
        font-size: 14px;
        color: #4d6265 !important;
        margin: 0 0 32px;
        line-height: 1.7;
      }
      
      form { display: flex; flex-direction: column; gap: 20px; }
      
      .field { position: relative; }
      .field label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #15262a !important;
        margin-bottom: 8px;
      }
      .field-shell { position: relative; display: flex; align-items: center; }
      .field-shell svg.field-icon {
        position: absolute;
        right: 16px;
        width: 18px; height: 18px;
        color: #2e8b86 !important;
        pointer-events: none;
      }
      .field input {
        width: 100%;
        padding: 14px 46px 14px 16px;
        border-radius: 14px;
        border: 1.5px solid #e1e9e8;
        background: #f6fbfa !important;
        font-size: 14.5px;
        font-family: inherit;
        color: #15262a !important;
        direction: ltr;
        text-align: right;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .field input::placeholder { color: #9fb0ae !important; font-weight: 400; }
      .field input:focus {
        outline: none;
        border-color: #4bb2ae;
        background: #fff !important;
        box-shadow: 0 0 0 4px rgba(75,178,174,.16);
      }
      
      .password-toggle {
        position: absolute;
        left: 14px;
        width: 22px; height: 22px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        color: #96a6a4 !important;
        background: none;
        border: none;
        padding: 0;
      }
      .password-toggle:hover { color: #2e8b86 !important; }
      .password-toggle svg { width: 19px; height: 19px; }
      
      .row-between { display: flex; align-items: center; justify-content: space-between; margin-top: -6px; }
      .forgot-link { font-size: 13px; font-weight: 600; color: #1f7a73 !important; position: relative; }
      .forgot-link::after { content: ""; position: absolute; right: 0; left: 0; bottom: -2px; height: 1px; background: currentColor; opacity: .4; }
      .forgot-link:hover::after { opacity: .9; }
      
      .btn-signin {
        margin-top: 6px;
        width: 100%;
        padding: 15px 20px;
        border: none;
        border-radius: 14px;
        background: linear-gradient(120deg, #2e8b86, #4bb2ae);
        color: #fff;
        font-family: inherit;
        font-size: 15.5px;
        font-weight: 800;
        letter-spacing: .2px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        box-shadow: 0 16px 30px -12px rgba(46,139,134,.55);
        transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
      }
      .btn-signin:hover { transform: translateY(-2px); box-shadow: 0 20px 34px -12px rgba(46,139,134,.65); }
      .btn-signin:active { transform: translateY(0); filter: brightness(.96); }
      .btn-signin svg { width: 17px; height: 17px; transform: scaleX(-1); }
      
      .auth-foot-hint {
        margin-top: 28px;
        font-size: 12.5px;
        color: #4d6265 !important;
        text-align: center;
        line-height: 1.8;
      }
      .auth-foot-hint b { color: #1f7a73 !important; }
      
      .site-footer {
        background: linear-gradient(90deg, #0e2f2d, #1f7a73) !important;
        color: #fff !important;
        padding: 14px 32px;
      }
      .site-footer__inner {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      }
      .contact-cluster { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
      .contact-item { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: #fff !important; }
      .contact-item .ico {
        width: 34px; height: 34px;
        border-radius: 50%;
        background: #fff !important;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .contact-item .ico svg { width: 15px; height: 15px; }
      
      .social-cluster { display: flex; align-items: center; gap: 10px; }
      .social-cluster a {
        width: 32px; height: 32px;
        border-radius: 9px;
        background: rgba(255,255,255,.14) !important;
        display: flex; align-items: center; justify-content: center;
        transition: background .18s ease, transform .18s ease;
      }
      .social-cluster a:hover { background: rgba(255,255,255,.3) !important; transform: translateY(-2px); }
      .social-cluster a svg { width: 15px; height: 15px; }
      
      .copyright-cluster {
        font-size: 11.5px;
        line-height: 1.8;
        text-align: left;
        color: rgba(255,255,255,.85) !important;
      }
      .copyright-cluster a { font-weight: 700; color: #fff !important; }
      
      @media (max-width: 992px) {
        .stage { flex-direction: column !important; }
        .hero { 
          padding: 32px 24px 28px !important; 
          min-height: 340px !important; 
          flex: none !important; 
          width: 100% !important;
          height: auto !important;
        }
        .hero__mid { margin: 26px 0 !important; }
        .hero__title { font-size: 28px !important; }
        .hero__desc { font-size: 14px !important; }
        .auth { max-width: none !important; padding: 32px 24px 40px !important; }
        .qr-card { display: none !important; }
        .site-footer__inner { justify-content: center !important; text-align: center !important; }
        .copyright-cluster { text-align: center !important; }
      }
      
      @media (max-width: 768px) {
        .hero { padding: 28px 20px 24px !important; min-height: 300px !important; }
        .hero__title { font-size: 26px !important; }
        .hero__desc { font-size: 13px !important; }
        .auth { padding: 28px 20px 36px !important; }
        .auth-card { max-width: 100% !important; }
      }
      
      @media (max-width: 560px) {
        .hero__top { flex-wrap: wrap !important; }
        .hero__title { font-size: 22px !important; }
        .hero__desc { font-size: 12px !important; }
        .store-row { flex-wrap: wrap !important; }
        .contact-cluster { justify-content: center !important; width: 100% !important; }
        .social-cluster { width: 100% !important; justify-content: center !important; }
        .hero { padding: 24px 16px 20px !important; }
        .auth { padding: 24px 16px 32px !important; }
        .field input { padding: 12px 40px 12px 14px !important; font-size: 14px !important; }
        .btn-signin { padding: 14px !important; font-size: 15px !important; }
      }
      
      @media (max-width: 400px) {
        .hero { padding: 20px 14px 16px !important; }
        .hero__title { font-size: 20px !important; }
        .auth { padding: 20px 14px 28px !important; }
        .brandmark { gap: 10px !important; }
        .brandmark__logo { width: 44px !important; height: 44px !important; }
        .brandmark__name { font-size: 18px !important; }
      }
    `;
    document.head.appendChild(style);

    // Create main structure
    const app = document.createElement('div');
    app.className = 'app';
    app.style.minHeight = '100vh';
    app.style.display = 'flex';
    app.style.flexDirection = 'column';

    const stripe = document.createElement('div');
    stripe.className = 'stripe';
    stripe.style.height = '4px';
    stripe.style.width = '100%';
    stripe.style.background = 'linear-gradient(90deg, #77bc23, #4bb2ae 45%, #1f7a73)';
    stripe.style.position = 'fixed';
    stripe.style.top = '0';
    stripe.style.right = '0';
    stripe.style.left = '0';
    stripe.style.zIndex = '50';
    app.appendChild(stripe);

    const stage = document.createElement('div');
    stage.className = 'stage';
    stage.style.flex = '1';
    stage.style.display = 'flex';
    stage.style.minHeight = '100vh';

    // HERO SECTION
    const hero = document.createElement('section');
    hero.className = 'hero';
    hero.style.position = 'relative';
    hero.style.flex = '1.15';
    hero.style.minWidth = '400px';
    hero.style.width = '55%';
    hero.style.minHeight = '100vh';
    hero.style.overflow = 'hidden';
    hero.style.display = 'flex';
    hero.style.flexDirection = 'column';
    hero.style.justifyContent = 'space-between';
    hero.style.padding = '48px 56px 40px';
    hero.style.color = '#fff';
    
    // Background gradient with image (matching reference design)
    hero.style.backgroundColor = '#0e2f2d';
    hero.style.backgroundImage = 'linear-gradient(160deg, rgba(10,40,38,0.85) 0%, rgba(15,60,57,0.65) 38%, rgba(23,110,104,0.5) 68%, rgba(43,150,140,0.5) 100%), url("https://i.imgur.com/FSMOTOv.jpeg")';
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center 20%';
    
    console.log('[JawwalPay UX+] Set inline background styles');
    console.log('[JawwalPay UX+] Hero backgroundColor style:', hero.style.backgroundColor);
    console.log('[JawwalPay UX+] Hero backgroundImage style:', hero.style.backgroundImage);

    const heroTop = document.createElement('div');
    heroTop.className = 'hero__top';

    const brandmark = document.createElement('div');
    brandmark.className = 'brandmark';

    const brandmarkLogo = document.createElement('div');
    brandmarkLogo.className = 'brandmark__logo';
    brandmarkLogo.innerHTML = `<svg viewBox="0 0 450 450" xmlns="http://www.w3.org/2000/svg">
      <g><path fill="#fdfefc" d="M 248.5,64.5 C 280.367,61.6917 306.2,72.6917 326,97.5C 335.717,111.983 341.05,127.983 342,145.5C 371.511,166.202 383.844,194.536 379,230.5C 370.752,265.748 348.919,287.248 313.5,295C 295.365,297.281 277.699,295.114 260.5,288.5C 233.427,299.743 206.76,298.909 180.5,286C 141.904,260.542 130.737,226.042 147,182.5C 153.768,167.897 163.935,156.23 177.5,147.5C 180.874,102.147 204.541,74.4806 248.5,64.5 Z"/></g>
      <g><path fill="#77bc23" d="M 248.5,78.5 C 282.563,75.4395 307.063,89.1062 322,119.5C 326.216,130.127 327.55,141.127 326,152.5C 323.409,172.193 319.243,191.527 313.5,210.5C 297.542,206.515 281.876,201.515 266.5,195.5C 265.5,176.512 265.167,157.512 265.5,138.5C 240.83,137.916 216.83,141.583 193.5,149.5C 193.808,111.89 212.141,88.2237 248.5,78.5 Z"/></g>
      <g><path fill="#76bc23" d="M 252.5,144.5 C 254.833,144.5 257.167,144.5 259.5,144.5C 259.5,161.5 259.5,178.5 259.5,195.5C 242.045,200.763 224.712,206.429 207.5,212.5C 218.161,236.471 233.661,256.805 254,273.5C 254.591,274.483 254.257,275.15 253,275.5C 218.259,289.122 188.926,281.789 165,253.5C 146.706,221.43 150.539,192.263 176.5,166C 184.923,158.738 194.589,153.738 205.5,151C 220.841,146.466 236.508,144.299 252.5,144.5 Z"/></g>
      <g><path fill="#9ccf60" d="M 252.5,144.5 C 254.948,143.527 257.615,143.194 260.5,143.5C 260.83,161.008 260.497,178.341 259.5,195.5C 259.5,178.5 259.5,161.5 259.5,144.5C 257.167,144.5 254.833,144.5 252.5,144.5 Z"/></g>
      <g><path fill="#76bc23" d="M 330.5,156.5 C 340.971,161.795 349.471,169.462 356,179.5C 371.44,207.546 369.44,234.212 350,259.5C 332.363,277.823 310.863,284.99 285.5,281C 274.992,278.909 265.326,274.909 256.5,269C 239.962,254.477 226.462,237.643 216,218.5C 215.51,217.207 215.343,215.873 215.5,214.5C 231.211,209.989 246.877,205.322 262.5,200.5C 280.086,206.53 297.752,212.03 315.5,217C 323.26,197.547 328.26,177.381 330.5,156.5 Z"/></g>
      <g><path fill="#fefffe" d="M 278.5,317.5 C 283.844,317.334 289.177,317.501 294.5,318C 301,328.5 307.5,339 314,349.5C 320.124,338.749 326.624,328.249 333.5,318C 338.533,317.171 343.533,317.338 348.5,318.5C 339.919,333.997 331.086,349.33 322,364.5C 321.949,374.266 321.282,383.933 320,393.5C 319.5,394 319,394.5 318.5,395C 314.514,395.499 310.514,395.666 306.5,395.5C 306.666,385.161 306.5,374.828 306,364.5C 296.306,349.107 287.139,333.44 278.5,317.5 Z"/></g>
      <g><path fill="#fefffe" d="M 173.5,318.5 C 185.838,318.333 198.171,318.5 210.5,319C 218.333,321.5 223.5,326.667 226,334.5C 227.375,342.857 226.375,350.857 223,358.5C 220.072,362.381 216.239,364.881 211.5,366C 202.84,366.5 194.173,366.666 185.5,366.5C 185.806,375.554 185.472,384.554 184.5,393.5C 183.975,394.192 183.308,394.692 182.5,395C 178.514,395.499 174.514,395.666 170.5,395.5C 170.333,371.164 170.5,346.831 171,322.5C 171.662,321.016 172.496,319.683 173.5,318.5 Z M 185.5,332.5 C 192.508,332.334 199.508,332.5 206.5,333C 212.889,337.269 214.055,342.769 210,349.5C 209.097,350.701 207.931,351.535 206.5,352C 199.508,352.5 192.508,352.666 185.5,352.5C 185.5,345.833 185.5,339.167 185.5,332.5 Z"/></g>
      <g><path fill="#fefffe" d="M 250.5,318.5 C 254.514,318.334 258.514,318.501 262.5,319C 263,319.5 263.5,320 264,320.5C 273.412,345.318 282.245,370.318 290.5,395.5C 285.821,395.666 281.155,395.499 276.5,395C 275.692,394.692 275.025,394.192 274.5,393.5C 272.593,388.609 270.593,383.776 268.5,379C 260.147,378.168 251.813,378.335 243.5,379.5C 241.901,383.796 240.401,388.129 239,392.5C 238.167,393.333 237.333,394.167 236.5,395C 231.5,395.667 226.5,395.667 221.5,395C 230.722,370.669 239.555,346.169 248,321.5C 249.045,320.627 249.878,319.627 250.5,318.5 Z M 255.5,343.5 C 256.497,343.47 257.164,343.97 257.5,345C 259.81,351.428 261.81,357.928 263.5,364.5C 258.489,364.666 253.489,364.499 248.5,364C 251.136,357.26 253.469,350.427 255.5,343.5 Z"/></g>
    </svg>`;
    brandmark.appendChild(brandmarkLogo);

    const brandmarkText = document.createElement('div');
    const brandmarkName = document.createElement('div');
    brandmarkName.className = 'brandmark__name';
    brandmarkName.textContent = 'Jawwal Pay';
    brandmarkText.appendChild(brandmarkName);
    const brandmarkTag = document.createElement('div');
    brandmarkTag.className = 'brandmark__tag';
    brandmarkTag.textContent = 'المنصة الالكترونية';
    brandmarkText.appendChild(brandmarkTag);
    brandmark.appendChild(brandmarkText);

    heroTop.appendChild(brandmark);

    const langPill = document.createElement('a');
    langPill.className = 'lang-pill';
    langPill.href = langLink;
    langPill.innerHTML = '<span>English</span>';
    heroTop.appendChild(langPill);

    hero.appendChild(heroTop);

    const heroMid = document.createElement('div');
    heroMid.className = 'hero__mid';

    const heroEyebrow = document.createElement('div');
    heroEyebrow.className = 'hero__eyebrow';
    heroEyebrow.textContent = 'بوابة الأعمال';
    heroMid.appendChild(heroEyebrow);

    const heroTitle = document.createElement('h1');
    heroTitle.className = 'hero__title';
    heroTitle.textContent = 'إدارة مدفوعاتك التجارية بثقة وأمان';
    heroMid.appendChild(heroTitle);

    const heroDesc = document.createElement('p');
    heroDesc.className = 'hero__desc';
    heroDesc.textContent = 'سجّل الدخول إلى منصة جوال باي للأعمال لمتابعة معاملاتك، وإدارة محفظتك الإلكترونية، والوصول إلى أدوات الدفع الخاصة بمنشأتك من مكان واحد.';
    heroMid.appendChild(heroDesc);

    hero.appendChild(heroMid);

    const heroBottom = document.createElement('div');
    heroBottom.className = 'hero__bottom';

    const storeRow = document.createElement('div');
    storeRow.className = 'store-row';

    const storeLabel = document.createElement('span');
    storeLabel.className = 'store-label';
    storeLabel.textContent = 'حمّل التطبيق';
    storeRow.appendChild(storeLabel);

    const androidBadge = document.createElement('a');
    androidBadge.className = 'store-badge android';
    androidBadge.href = androidLink;
    androidBadge.target = '_blank';
    androidBadge.innerHTML = `<svg viewBox="0 0 405.33 512.04" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M362.68,192H149.35a10.67,10.67,0,0,0-10.67,10.67V373.37a53.42,53.42,0,0,0,42.67,52.26V480a32,32,0,0,0,64,0V426.7h21.33V480a32,32,0,0,0,64,0v-54.4a53.4,53.4,0,0,0,42.67-52.26V202.7A10.66,10.66,0,0,0,362.68,192Z" transform="translate(-53.35 0)"/><path fill="#fff" d="M311.85,56.85l18-42A10.66,10.66,0,0,0,310.22,6.5l-18,42a116.28,116.28,0,0,0-72.41,0l-18-42a10.65,10.65,0,1,0-19.58,8.38l18,42A117.4,117.4,0,0,0,138.68,160a10.67,10.67,0,0,0,10.67,10.67H362.68A10.67,10.67,0,0,0,373.35,160,117.43,117.43,0,0,0,311.85,56.85ZM213.35,128A10.67,10.67,0,1,1,224,117.37,10.67,10.67,0,0,1,213.35,128Zm85.33,0a10.67,10.67,0,1,1,10.67-10.66A10.67,10.67,0,0,1,298.68,128Z" transform="translate(-53.35 0)"/><path fill="#fcfcfc" d="M426.68,192a32,32,0,0,0-32,32V330.7a32,32,0,0,0,64,0V224A32,32,0,0,0,426.68,192Z" transform="translate(-53.35 0)"/><path fill="#fff" d="M85.35,192a32,32,0,0,0-32,32V330.7a32,32,0,0,0,64,0V224A32,32,0,0,0,85.35,192Z" transform="translate(-53.35 0)"/></svg>`;
    storeRow.appendChild(androidBadge);

    const appleBadge = document.createElement('a');
    appleBadge.className = 'store-badge apple';
    appleBadge.href = appleLink;
    appleBadge.target = '_blank';
    appleBadge.innerHTML = `<svg viewBox="0 0 256 314.4" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M213.8,167c.45,47.58,41.74,63.41,42.2,63.61a172,172,0,0,1-21.76,44.72c-13.1,19.15-26.7,38.24-48.13,38.63-21.05.39-27.82-12.48-51.89-12.48s-31.58,12.09-51.5,12.87c-20.68.78-36.43-20.71-49.65-39.79-27-39-47.63-110.3-19.92-158.41,13.76-23.89,38.36-39,65.05-39.4,20.31-.39,39.48,13.66,51.89,13.66s35.7-16.9,60.19-14.42c10.25.43,39,4.14,57.5,31.19-1.49.92-34.33,20-34,59.82M174.24,50.2c11-13.29,18.37-31.79,16.35-50.2-15.82.64-35,10.55-46.31,23.83C134.11,35.59,125.2,54.42,127.6,72.46c17.64,1.37,35.66-9,0,0"/></svg>`;
    storeRow.appendChild(appleBadge);

    heroBottom.appendChild(storeRow);

    const qrCard = document.createElement('div');
    qrCard.className = 'qr-card';
    qrCard.innerHTML = `<img src="${qrImg}" alt="QR" width="56" height="56"><div class="qr-card__text">امسح للتحميل<span>عبر تطبيق الكاميرا</span></div>`;
    heroBottom.appendChild(qrCard);

    hero.appendChild(heroBottom);

    stage.appendChild(hero);
    
    console.log('[JawwalPay UX+] Hero added to stage, stage children:', stage.children.length);
    console.log('[JawwalPay UX+] Hero computed background:', window.getComputedStyle(hero).backgroundColor);

    // AUTH SECTION
    const auth = document.createElement('section');
    auth.className = 'auth';
    auth.style.flex = '1';
    auth.style.maxWidth = '560px';
    auth.style.background = '#ffffff';
    auth.style.display = 'flex';
    auth.style.alignItems = 'center';
    auth.style.justifyContent = 'center';
    auth.style.padding = '40px';
    auth.style.position = 'relative';

    const authCard = document.createElement('div');
    authCard.className = 'auth-card';

    const authIcon = document.createElement('div');
    authIcon.className = 'auth-icon';
    authIcon.innerHTML = `<svg viewBox="0 0 104.25 110.11" xmlns="http://www.w3.org/2000/svg"><path fill="#2e8b86" d="M52.29,53.66c13.87,0,24.27-11.77,24.27-27.1C76.56,12.26,65.87,0,52.29,0S27.83,12.26,28,26.56C28,41.89,38.43,53.66,52.29,53.66ZM9,110.11H95.22c5.56,0,9-1.66,9-7,0-16-20-38-52.15-38S0,87.11,0,103.08C0,108.45,3.47,110.11,9,110.11Z"/></svg>`;
    authCard.appendChild(authIcon);

    const authTitle = document.createElement('h2');
    authTitle.textContent = 'تسجيل الدخول';
    authCard.appendChild(authTitle);

    const authSub = document.createElement('p');
    authSub.className = 'auth-card__sub';
    authSub.textContent = 'أدخل بيانات حسابك التجاري للوصول إلى لوحة التحكم الخاصة بمنشأتك.';
    authCard.appendChild(authSub);

    // Create form
    const newForm = document.createElement('form');
    newForm.action = formAction;
    newForm.method = formMethod;
    newForm.name = formName;
    newForm.id = formId;
    newForm.autocomplete = 'off';
    
    // Add all hidden fields from original form (CSRF tokens, etc.)
    allFormFields.forEach(field => {
      if (field.name && field.type === 'hidden') {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = field.name;
        hiddenInput.value = field.value;
        if (field.id) hiddenInput.id = field.id;
        newForm.appendChild(hiddenInput);
        console.log('[JawwalPay UX+] Preserved hidden field:', field.name);
      }
    });

    // Username field
    const usernameField = document.createElement('div');
    usernameField.className = 'field';

    const usernameLabel = document.createElement('label');
    usernameLabel.htmlFor = 'username';
    usernameLabel.textContent = 'اسم المستخدم';
    usernameField.appendChild(usernameLabel);

    const usernameShell = document.createElement('div');
    usernameShell.className = 'field-shell';

    const usernameIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    usernameIconSvg.setAttribute('class', 'field-icon');
    usernameIconSvg.setAttribute('viewBox', '0 0 104.25 110.11');
    usernameIconSvg.setAttribute('fill', 'currentColor');
    usernameIconSvg.innerHTML = '<path d="M52.29,53.66c13.87,0,24.27-11.77,24.27-27.1C76.56,12.26,65.87,0,52.29,0S27.83,12.26,28,26.56C28,41.89,38.43,53.66,52.29,53.66ZM9,110.11H95.22c5.56,0,9-1.66,9-7,0-16-20-38-52.15-38S0,87.11,0,103.08C0,108.45,3.47,110.11,9,110.11Z"/>';
    usernameShell.appendChild(usernameIconSvg);

    const newUsernameInput = document.createElement('input');
    newUsernameInput.type = 'text';
    newUsernameInput.id = 'username';
    newUsernameInput.name = 'username';
    newUsernameInput.value = usernameValue;
    newUsernameInput.placeholder = 'Username@serviceName';
    usernameShell.appendChild(newUsernameInput);

    usernameField.appendChild(usernameShell);
    newForm.appendChild(usernameField);

    // Password field
    const passwordField = document.createElement('div');
    passwordField.className = 'field';

    const passwordLabel = document.createElement('label');
    passwordLabel.htmlFor = 'passwordInput';
    passwordLabel.textContent = 'كلمة المرور';
    passwordField.appendChild(passwordLabel);

    const passwordShell = document.createElement('div');
    passwordShell.className = 'field-shell';

    const passwordIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    passwordIconSvg.setAttribute('class', 'field-icon');
    passwordIconSvg.setAttribute('viewBox', '0 0 448 512');
    passwordIconSvg.setAttribute('fill', 'currentColor');
    passwordIconSvg.innerHTML = '<path d="M400,224H376V152C376,68.2,307.8,0,224,0S72,68.2,72,152v72H48A48.012,48.012,0,0,0,0,272V464a48.012,48.012,0,0,0,48,48H400a48.012,48.012,0,0,0,48-48V272A48.012,48.012,0,0,0,400,224ZM152,152a72,72,0,0,1,144,0v72H152Z"/>';
    passwordShell.appendChild(passwordIconSvg);

    const newPasswordInput = document.createElement('input');
    newPasswordInput.type = 'password';
    newPasswordInput.id = 'passwordInput';
    newPasswordInput.name = 'password';
    newPasswordInput.value = passwordValue;
    newPasswordInput.placeholder = 'Password';
    passwordShell.appendChild(newPasswordInput);

    const passwordToggle = document.createElement('button');
    passwordToggle.type = 'button';
    passwordToggle.className = 'password-toggle';
    passwordToggle.id = 'togglePassword';
    passwordToggle.setAttribute('aria-label', 'إظهار كلمة المرور');
    passwordToggle.innerHTML = `<svg id="eyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    passwordShell.appendChild(passwordToggle);

    passwordField.appendChild(passwordShell);
    newForm.appendChild(passwordField);

    // Forgot password link
    const rowBetween = document.createElement('div');
    rowBetween.className = 'row-between';

    const forgotLink = document.createElement('a');
    forgotLink.className = 'forgot-link';
    forgotLink.href = forgotPasswordLink;
    forgotLink.textContent = 'هل نسيت كلمة المرور؟';
    rowBetween.appendChild(forgotLink);

    newForm.appendChild(rowBetween);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn-signin';
    submitBtn.id = 'signinBtn';
    submitBtn.innerHTML = `<span>تسجيل الدخول</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
    newForm.appendChild(submitBtn);

    authCard.appendChild(newForm);

    // Add error message if present
    if (errorMessage) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'login-error-message';
      errorDiv.style.cssText = 'background: #fee2e2; color: #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; border: 1px solid #fecaca;';
      errorDiv.textContent = errorMessage;
      authCard.appendChild(errorDiv);
      console.log('[JawwalPay UX+] Added error message to form:', errorMessage);
    }

    const authFootHint = document.createElement('p');
    authFootHint.className = 'auth-foot-hint';
    authFootHint.innerHTML = 'بحاجة إلى مساعدة؟ تواصل معنا على <b>1177</b>';
    authCard.appendChild(authFootHint);

    auth.appendChild(authCard);
    stage.appendChild(auth);

    app.appendChild(stage);

    // FOOTER
    const footer = document.createElement('footer');
    footer.className = 'site-footer';

    const footerInner = document.createElement('div');
    footerInner.className = 'site-footer__inner';

    const contactCluster = document.createElement('div');
    contactCluster.className = 'contact-cluster';

    const phoneContact = document.createElement('a');
    phoneContact.className = 'contact-item';
    phoneContact.href = phoneLink;
    phoneContact.innerHTML = `<span class="ico"><svg viewBox="0 0 251.3 402" xmlns="http://www.w3.org/2000/svg"><path fill="#77bc23" d="M213.5,0H37.7A37.74,37.74,0,0,0,0,37.7V364.3A37.74,37.74,0,0,0,37.7,402H213.6a37.74,37.74,0,0,0,37.7-37.7V37.7A37.88,37.88,0,0,0,213.5,0ZM126.3,389.6a23.47,23.47,0,1,1,.06,0Zm87.2-72a17,17,0,0,1-17,17H54.9a17,17,0,0,1-17-17V294.1a6.42,6.42,0,0,1-.2-2V47.1a9.38,9.38,0,0,1,9.38-9.4h157a9.38,9.38,0,0,1,9.4,9.38V317.6Z"/></svg></span><span>1177</span>`;
    contactCluster.appendChild(phoneContact);

    const websiteContact = document.createElement('a');
    websiteContact.className = 'contact-item';
    websiteContact.href = websiteLink;
    websiteContact.target = '_blank';
    websiteContact.innerHTML = `<span class="ico"><svg viewBox="0 0 325.4 244" xmlns="http://www.w3.org/2000/svg"><path fill="#77bc23" d="M294.9,0H30.5A30.56,30.56,0,0,0,0,30.5v183A30.56,30.56,0,0,0,30.5,244H294.9a30.56,30.56,0,0,0,30.5-30.5V30.5A30.49,30.49,0,0,0,294.92,0ZM107,156.1c14.2,11.8,34,27,55.7,26.9,21.7.1,41.4-15.1,55.7-26.9L276,213.5H49.4Zm132.4-16.8c25.3-19.8,42.8-33.6,55.5-43.8v99.1ZM30.5,30.5H294.9V56.4c-14.2,11.6-37,29.7-85.5,67.7-10.7,8.4-31.9,28.7-46.6,28.4-14.7.3-36-20-46.6-28.4C67.6,86.1,44.9,68,30.7,56.4V30.5ZM86,139.3,30.5,194.7V95.6C43.3,105.7,60.7,119.5,86,139.3Z"/></svg></span><span>أرسل ملاحظات</span>`;
    contactCluster.appendChild(websiteContact);

    footerInner.appendChild(contactCluster);

    const socialCluster = document.createElement('div');
    socialCluster.className = 'social-cluster';

    const facebookLinkEl = document.createElement('a');
    facebookLinkEl.href = facebookLink;
    facebookLinkEl.target = '_blank';
    facebookLinkEl.innerHTML = `<svg viewBox="0 0 493.99 493.99" xmlns="http://www.w3.org/2000/svg"><path fill="#fcfffa" d="M255.12,502.07C118.73,502.07,8.17,391.51,8.17,255.12A247,247,0,0,1,80.5,80.5C176.89-16,333.25-16.07,429.74,80.32s96.57,252.76.18,349.24l-.18.18A245.34,245.34,0,0,1,255.12,502.07Zm0-474.68c-125.77,0-227.72,102-227.7,227.76a227.74,227.74,0,0,0,66.7,161c89.76,88.1,233.94,86.76,322-3,86.95-88.58,86.95-230.48,0-319.06a226.26,226.26,0,0,0-161-66.7Z" transform="translate(-8.17 -8.08)"/><path fill="#fff" d="M279.64,187.42V220.6h49l-7.84,51.11H279.6V395.26a173,173,0,0,1-55.2-.26V271.71H179.48V220.6H224.4V181.65c0-44.31,26.37-68.78,66.78-68.78a271.8,271.8,0,0,1,39.57,3.45v43.49H308.46C286.5,159.81,279.64,173.43,279.64,187.42Z" transform="translate(-8.17 -8.08)"/></svg>`;
    socialCluster.appendChild(facebookLinkEl);

    const twitterLinkEl = document.createElement('a');
    twitterLinkEl.href = twitterLink;
    twitterLinkEl.target = '_blank';
    twitterLinkEl.innerHTML = `<svg viewBox="0 0 479.67 479.67" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M381.2,190.46c.2,2.82.2,5.64.2,8.46,0,86-65.45,185.1-185.09,185.1a183.88,183.88,0,0,1-99.9-29.2,135.17,135.17,0,0,0,15.71.8,130.33,130.33,0,0,0,80.76-27.79,65.18,65.18,0,0,1-60.82-45.12,81.46,81.46,0,0,0,12.28,1,68.67,68.67,0,0,0,17.12-2.22,65,65,0,0,1-52.16-63.84v-.81a65.54,65.54,0,0,0,29.4,8.26,65.16,65.16,0,0,1-20.14-87A184.94,184.94,0,0,0,252.7,206.17a72.47,72.47,0,0,1-1.61-14.9,65.11,65.11,0,0,1,112.59-44.51A128.08,128.08,0,0,0,405,131.05a65,65,0,0,1-28.6,35.85,130.6,130.6,0,0,0,37.46-10.07,139.72,139.72,0,0,1-32.63,33.63Z" transform="translate(-15.28 -15.28)"/></svg>`;
    socialCluster.appendChild(twitterLinkEl);

    const instagramLinkEl = document.createElement('a');
    instagramLinkEl.href = instagramLink;
    instagramLinkEl.target = '_blank';
    instagramLinkEl.innerHTML = `<svg viewBox="0 0 493.9 493.9" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M255.15,173.08a81.91,81.91,0,1,0,.18,0Zm0,135.37a53.34,53.34,0,1,1,53.34-53.34h0A53.41,53.41,0,0,1,255.15,308.45ZM359.68,169.72a19.14,19.14,0,1,1-19.15-19.13h0a19.09,19.09,0,0,1,19.13,19ZM414,189.14c-1.21-25.63-7.07-48.33-25.85-67s-41.41-24.56-67-25.85c-26.42-1.5-105.6-1.5-132,0-25.56,1.22-48.27,7.07-67.05,25.78s-24.56,41.41-25.84,67c-1.5,26.42-1.5,105.6,0,132,1.21,25.63,7.07,48.34,25.84,67.05s41.38,24.58,67,25.88c26.42,1.5,105.6,1.5,132,0,25.63-1.21,48.34-7.06,67-25.84s24.56-41.42,25.85-67.05c1.5-26.42,1.5-105.53,0-132Zm-34.13,160.3a54,54,0,0,1-30.42,30.41c-21.06,8.36-71,6.43-94.32,6.43s-73.32,1.86-94.32-6.43a54,54,0,0,1-30.41-30.41C122,328.37,124,278.39,124,255.12s-1.86-73.33,6.43-94.32a54,54,0,0,1,30.41-30.42c21.07-8.35,71-6.42,94.32-6.42s73.33-1.86,94.32,6.42a54,54,0,0,1,30.42,30.42c8.35,21.06,6.43,71,6.43,94.32s1.94,73.33-6.41,94.32Z" transform="translate(-8.17 -8.17)"/></svg>`;
    socialCluster.appendChild(instagramLinkEl);

    footerInner.appendChild(socialCluster);

    const copyrightCluster = document.createElement('div');
    copyrightCluster.className = 'copyright-cluster';
    copyrightCluster.innerHTML = `<span>Jawwal Pay، جميع الحقوق محفوظة &nbsp;·&nbsp; مرخص من سلطة النقد الفلسطينية</span><br><a target="_blank" href="${websiteLink}">www.JawwalPay.ps</a>`;
    footerInner.appendChild(copyrightCluster);

    footer.appendChild(footerInner);
    app.appendChild(footer);

    document.body.appendChild(app);

    // Add JavaScript for toggle and submit
    const toggleBtn = document.getElementById('togglePassword');
    const pwInput = document.getElementById('passwordInput');
    const eyeIcon = document.getElementById('eyeIcon');

    const eyeOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    const eyeClosed = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';

    toggleBtn.addEventListener('click', () => {
      const isPassword = pwInput.type === 'password';
      pwInput.type = isPassword ? 'text' : 'password';
      eyeIcon.innerHTML = isPassword ? eyeClosed : eyeOpen;
      toggleBtn.setAttribute('aria-label', isPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    });

    document.getElementById('signinBtn').addEventListener('click', () => {
      document.getElementById('loginForm').submit();
    });

    document.querySelectorAll('#loginForm input').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('loginForm').submit();
        }
      });
    });

    console.log('[JawwalPay UX+] Login page rebuilt successfully to match reference design');

  } catch (error) {
    console.error('[JawwalPay UX+] Error rebuilding login page:', error);
  }
}

// Auto-execute when loaded
enhanceLoginPage();
