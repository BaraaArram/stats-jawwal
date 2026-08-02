// Registration page enhancer - injects enhanced registration UX
console.log('[JawwalPay UX+] registration.js loaded');

function enhanceRegistrationPage() {
  try {
    console.log('[JawwalPay UX+] Injecting registration page design...');
    extractDataAndInject();
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing registration page:', error);
  }
}

function extractDataAndInject() {
  const originalBody = document.body;
  const { userName, userRole, navLinks } = extractPageMetadata(originalBody);

  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'jawwalpay-uxplus-overlay';
  overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.style.padding = '0';

  const style = document.createElement('style');
  style.textContent = getPageSpecificCSS();
  overlayContainer.appendChild(style);

  overlayContainer.appendChild(buildRegistrationHTML(navLinks, userName, userRole));
  document.body.appendChild(overlayContainer);

  initNavTabs(overlayContainer);
  initDropdowns(overlayContainer);
  setupRegistrationFlow(overlayContainer);

  console.log('[JawwalPay UX+] Registration page design injected');
}

function setupRegistrationFlow(container) {
  const otpDiv = container.querySelector('#enhanced-otpCodeDiv');
  const otpFieldWrapper = container.querySelector('#enhanced-otpFieldWrapper');
  const sendBtn = container.querySelector('#enhanced-sendOTPBtn');
  const submitBtn = container.querySelector('#enhanced-submitFormBtn');
  const resendBtn = container.querySelector('#enhanced-reSendOTPBtn');
  const counterLabel = container.querySelector('#enhanced-counterIdLabel');
  const counterValue = container.querySelector('#enhanced-counterId');
  const statusBox = container.querySelector('#enhanced-statusPopup');
  const mobileInput = container.querySelector('#enhanced-agentMobileNumber');
  const otpInputs = Array.from(container.querySelectorAll('.enhanced-otp-digit'));
  const otpInput = container.querySelector('#enhanced-otpCode');
  const originalPhoneInput = document.querySelector('input[type="tel"][maxlength="10"], input[name*="mobile" i], input[name*="phone" i], input[id*="mobile" i], input[id*="phone" i]');
  const originalOtpInput = document.querySelector('input[name*="otp" i], input[id*="otp" i], input[name*="activation" i], input[id*="activation" i]');
  let intervalId = null;
  const countdownSeconds = 60;

  function clearStatus() {
    if (statusBox) {
      statusBox.innerHTML = '';
      statusBox.style.display = 'none';
    }
  }

  function showStatus(message, type = 'success') {
    if (!statusBox) return;
    const colorClass = type === 'error' ? 'alert-danger' : 'alert-success';
    statusBox.style.display = 'block';
    statusBox.innerHTML = `
      <div class="alert-list">
        <div class="alert alert-block ${colorClass}">
          <button data-dismiss="alert" class="close" type="button">x</button>
          ${message}
        </div>
      </div>`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function resetFormState() {
    otpDiv.style.display = 'none';
    otpFieldWrapper.style.display = 'none';
    sendBtn.style.display = 'inline-flex';
    submitBtn.style.display = 'none';
    resendBtn.style.display = 'none';
    counterLabel.style.display = 'none';
    counterValue.textContent = '';
    if (otpInput) otpInput.value = '';
    clearInterval(intervalId);
    intervalId = null;
  }

  function startCountdown() {
    clearInterval(intervalId);
    let remaining = countdownSeconds;
    counterLabel.style.display = 'inline-flex';
    counterValue.textContent = formatTime(remaining);
    resendBtn.style.display = 'none';

    intervalId = setInterval(() => {
      remaining -= 1;
      counterValue.textContent = remaining > 0 ? formatTime(remaining) : '';
      if (remaining <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        resendBtn.style.display = 'inline-flex';
        counterLabel.style.display = 'none';
        counterValue.textContent = '';
      }
    }, 1000);
  }

  function validatePhone() {
    const value = mobileInput?.value.trim() || '';
    const valid = /^05\d{8}$/.test(value);
    if (!valid) {
      showStatus('رقم الموبايل غير صحيح، يجب أن يبدأ بـ 05 ويكون مكوناً من 10 خانات', 'error');
    }
    return valid;
  }

  function getOtpCode() {
    return otpInputs.map((input) => input.value.trim()).join('');
  }

  function updateOtpValue() {
    const code = getOtpCode();
    if (otpInput) {
      otpInput.value = code;
    }
    if (originalOtpInput) {
      originalOtpInput.value = code;
      originalOtpInput.dispatchEvent(new Event('input', { bubbles: true }));
      originalOtpInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function setSubmitState() {
    if (!submitBtn) return;
    submitBtn.disabled = getOtpCode().length !== 5;
  }

  function performSendCode(message) {
    clearStatus();
    if (!validatePhone()) return false;

    otpDiv.style.display = 'block';
    otpFieldWrapper.style.display = 'grid';
    sendBtn.style.display = 'none';
    submitBtn.style.display = 'inline-flex';
    setSubmitState();
    resendBtn.style.display = 'none';
    showStatus(message, 'success');
    if (otpInputs[0]) otpInputs[0].focus();
    startCountdown();
    return true;
  }

  function syncOverlayToOriginalInputs() {
    if (originalPhoneInput && mobileInput) {
      originalPhoneInput.value = mobileInput.value.trim();
      originalPhoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      originalPhoneInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (!originalPhoneInput) {
      console.warn('[JawwalPay UX+] Original phone input not found for sync');
    }

    updateOtpValue();

    if (!originalOtpInput) {
      console.warn('[JawwalPay UX+] Original OTP input not found for sync');
    }
  }

  function extractOtpResponseMessage(message) {
    if (typeof message !== 'string') return '';
    return message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function invokePageSendActivation() {
    syncOverlayToOriginalInputs();

    if (!validatePhone()) {
      return { success: false, message: 'رقم الموبايل غير صحيح، يجب أن يبدأ بـ 05 ويكون مكوناً من 10 خانات' };
    }

    const phoneValue = mobileInput?.value.trim() || '';
    try {
      const otpApi = window.JawwalPayAPI?.sendOtpCode;
      if (typeof otpApi === 'function') {
        const result = await otpApi({ agentMobileNumber: phoneValue });
        if (result && typeof result === 'object') {
          const message = extractOtpResponseMessage(result.message);
          if (result.success === true) {
            console.log('[JawwalPay UX+] OTP request succeeded via API', result);
            return { success: true, message: message || 'تم إرسال رمز التفعيل إلى رقم المحمول بنجاح' };
          }

          if (result.success === false) {
            const errorMessage = message || 'تعذر إرسال رمز التفعيل، يرجى المحاولة مرة أخرى';
            showStatus(errorMessage, 'error');
            return { success: false, message: errorMessage };
          }
        }
      }
    } catch (error) {
      console.warn('[JawwalPay UX+] OTP API request failed:', error);
    }

    if (typeof window.sendActivationCodeFunction === 'function') {
      try {
        console.log('[JawwalPay UX+] Invoking sendActivationCodeFunction()');
        window.sendActivationCodeFunction();
        return { success: true, message: 'تم إرسال رمز التفعيل إلى رقم المحمول بنجاح' };
      } catch (error) {
        console.warn('[JawwalPay UX+] sendActivationCodeFunction failed:', error);
        return { success: false, message: 'تعذر إرسال رمز التفعيل، يرجى المحاولة مرة أخرى' };
      }
    }

    console.warn('[JawwalPay UX+] sendActivationCodeFunction is not defined on window');
    return { success: false, message: 'تعذر إرسال رمز التفعيل، يرجى المحاولة مرة أخرى' };
  }

  function invokePageConfirm() {
    syncOverlayToOriginalInputs();
    if (typeof window.confirmFunction === 'function') {
      try {
        console.log('[JawwalPay UX+] Invoking confirmFunction()');
        window.confirmFunction();
        return true;
      } catch (error) {
        console.warn('[JawwalPay UX+] confirmFunction failed:', error);
        return false;
      }
    }
    console.warn('[JawwalPay UX+] confirmFunction is not defined on window');
    return null;
  }

  async function handleSendCode() {
    const activationResult = await invokePageSendActivation();
    if (!activationResult?.success) return;
    performSendCode(activationResult.message || 'تم إرسال رمز التفعيل إلى رقم المحمول بنجاح');
  }

  async function handleResendCode() {
    const activationResult = await invokePageSendActivation();
    if (!activationResult?.success) return;
    if (performSendCode(activationResult.message || 'تم إعادة إرسال رمز التفعيل بنجاح')) {
      counterLabel.style.display = 'inline-flex';
      if (otpInput) otpInput.focus();
    }
  }

  function handleSubmit() {
    const confirmed = invokePageConfirm();
    if (confirmed === false) return;
    clearStatus();
    const otpCode = getOtpCode();
    if (otpCode.length !== 5) {
      showStatus('الرجاء إدخال رمز التفعيل المكون من 5 أرقام', 'error');
      return;
    }
    showStatus('تم التحقق من رمز التفعيل بنجاح', 'success');
  }

  function handleOtpInput(event) {
    const target = event.target;
    const value = (target.value || '').replace(/\D/g, '');
    if (!value) {
      target.value = '';
      updateOtpValue();
      setSubmitState();
      return;
    }

    const currentIndex = otpInputs.indexOf(target);
    if (value.length > 1) {
      const digits = value.slice(0, otpInputs.length).split('');
      otpInputs.forEach((input, index) => {
        input.value = digits[index] || '';
      });
      const focusIndex = Math.min(digits.length, otpInputs.length - 1);
      otpInputs[focusIndex].focus();
    } else {
      target.value = value;
      if (currentIndex < otpInputs.length - 1) {
        otpInputs[currentIndex + 1].focus();
      }
    }

    updateOtpValue();
    setSubmitState();
  }

  function handleOtpKeyDown(event) {
    const target = event.target;
    const currentIndex = otpInputs.indexOf(target);
    if (event.key === 'Backspace' && target.value === '' && currentIndex > 0) {
      otpInputs[currentIndex - 1].focus();
      otpInputs[currentIndex - 1].value = '';
      updateOtpValue();
      setSubmitState();
      event.preventDefault();
    }
  }

  function handleOtpPaste(event) {
    const pastedText = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, otpInputs.length);
    if (!pastedText) return;
    event.preventDefault();
    otpInputs.forEach((input, index) => {
      input.value = pastedText[index] || '';
    });
    const nextIndex = Math.min(pastedText.length, otpInputs.length - 1);
    otpInputs[nextIndex].focus();
    updateOtpValue();
    setSubmitState();
  }

  function handleOtpFocus(event) {
    event.target.select();
  }

  sendBtn.addEventListener('click', handleSendCode);
  resendBtn.addEventListener('click', handleResendCode);
  submitBtn.addEventListener('click', handleSubmit);
  otpInputs.forEach((input) => {
    input.addEventListener('input', handleOtpInput);
    input.addEventListener('keydown', handleOtpKeyDown);
    input.addEventListener('paste', handleOtpPaste);
    input.addEventListener('focus', handleOtpFocus);
  });

  resetFormState();
}

function getPageSpecificCSS() {
  return `
.page{padding:28px 0 64px;}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-soft);margin-bottom:18px;}
.breadcrumb a{color:var(--ink-soft);text-decoration:none;transition:color .15s;}
.breadcrumb a:hover{color:var(--jp-green-dark);}
.breadcrumb .sep{opacity:.5;}
.breadcrumb .current{color:var(--jp-green-dark);font-weight:700;}
.form-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);margin-bottom:28px;overflow:hidden;max-width:760px;margin-inline:auto;}
.form-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 26px;border-bottom:1px solid var(--line);background:var(--jp-green-pale-2);}
.form-card-head h2{font-family:'Cairo';font-size:17px;font-weight:800;margin:0;display:flex;align-items:center;gap:10px;}
.form-card-head .fc-ic{width:34px;height:34px;border-radius:10px;background:var(--jp-green-pale);color:var(--jp-green-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.form-card-body{padding:26px;}
.enhanced-status-popup{position:fixed;top:20px;right:20px;z-index:100001;max-width:360px;display:none;}
.enhanced-status-popup .alert-list{margin:0;display:flex;justify-content:flex-start;}
.enhanced-status-popup .alert.alert-block{position:relative;display:inline-flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.18);background:rgba(15,23,42,0.96);border:1px solid rgba(148,163,184,.24);color:#f8fafc;}
.enhanced-status-popup .alert.alert-block.alert-danger{border-color:rgba(248,113,113,.3);background:rgba(185,28,28,0.95);}
.enhanced-status-popup .alert.alert-block.alert-success{border-color:rgba(34,197,94,.3);background:rgba(5,150,105,0.95);}
.enhanced-status-popup .alert.alert-block .close{position:absolute;top:8px;right:8px;line-height:1;color:#f8fafc;opacity:.85;}
.form-card-foot{display:flex;align-items:center;gap:12px;padding:18px 26px;border-top:1px solid var(--line);flex-wrap:wrap;}
.section-divider{display:flex;align-items:center;gap:10px;margin:26px 0 18px;font-family:'Cairo';font-weight:700;font-size:13px;color:var(--jp-green-dark);}
.section-divider:first-child{margin-top:0;}
.section-divider::after{content:'';flex:1;height:1px;background:var(--line);}
.field-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px 24px;}
.field-grid.tight{max-width:640px;}
.field{display:flex;flex-direction:column;gap:6px;}
.field.span-2{grid-column:1 / -1;}
.field label{font-size:12.5px;font-weight:700;color:var(--ink-soft);}
.field label .req{color:var(--red);margin-right:3px;}
.field input[type=text],.field input[type=email],.field input[type=date],.field input[type=tel],.field select{height:42px;border:1px solid var(--line-strong);border-radius:10px;padding:0 14px;font-family:'Tajawal';font-size:13.5px;color:var(--ink);background:#fff;outline:none;transition:border-color .15s, box-shadow .15s;width:100%;}
.field input:focus,.field select:focus{border-color:var(--jp-green);box-shadow:0 0 0 3px var(--jp-green-pale);}
.field input:disabled,.field input[readonly]{background:var(--paper);color:var(--ink-soft);}
.field select{appearance:none;-webkit-appearance:none;background-image:url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"%3E%3Cpath d="M6 9l6 6 6-6" stroke="%234B5541" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:left 12px center;background-size:16px;padding-left:36px;}
.field-note{font-size:11.5px;color:var(--ink-soft);}
.otp-boxes{display:flex;gap:12px;direction:ltr;justify-content:center;}
.enhanced-otp-digit{width:50px;height:58px;text-align:center;font-family:'Cairo';font-weight:800;font-size:22px;border:1px solid var(--line-strong);border-radius:12px;outline:none;transition:border-color .15s,box-shadow .15s;background:var(--paper);color:var(--ink);}
.enhanced-otp-digit:focus{border-color:var(--jp-green);box-shadow:0 0 0 3px rgba(96,175,97,.18);}
.enhanced-otp-digit::placeholder{color:rgba(74,85,65,.4);}
.countdown-chip{display:inline-flex;align-items:center;gap:6px;background:#FFF3E0;color:var(--amber);font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--jp-green),var(--jp-green-2));color:#fff;font-family:'Cairo';font-weight:700;font-size:13.5px;border:none;border-radius:10px;padding:0 22px;height:44px;cursor:pointer;transition:box-shadow .15s, transform .15s;box-shadow:var(--shadow-sm);}
.btn-primary:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);font-family:'Cairo';font-weight:700;font-size:13.5px;border:1px solid var(--line-strong);border-radius:10px;padding:0 20px;height:44px;cursor:pointer;transition:border-color .15s,color .15s;}
.btn-secondary:hover{border-color:var(--jp-green);color:var(--jp-green-dark);}
@media (max-width:900px){.field-grid{grid-template-columns:1fr;}.info-grid{grid-template-columns:1fr;}.filter-grid{grid-template-columns:1fr 1fr;}}
@media (max-width:600px){.filter-grid{grid-template-columns:1fr;}}
`;
}

function buildRegistrationHTML(navLinks, userName = 'User', userRole = 'Agent') {
  const container = document.createElement('div');
  container.innerHTML = `
${getUtilityBarHTML()}
${getHeaderHTML({ userName, userRole })}
${getNavHTML('agent', navLinks)}
<div class="page">
  <div id="enhanced-statusPopup" class="enhanced-status-popup"></div>
  <div class="wrap">
    <div class="breadcrumb">
      <a href="#">الرئيسية</a><span class="sep">/</span><a href="#">الوكيل</a><span class="sep">/</span><a href="#">خدمات الافراد والاعمال</a><span class="sep">/</span><span class="current">تسجيل مشترك</span>
    </div>
    <div class="form-card">
      <div class="form-card-head">
        <h2><span class="fc-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.6-4 4.5-5.6 7.5-5.6S17.9 16 19.5 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>تسجيل مشترك جديد</h2>
      </div>
      <div class="form-card-body">
        <div class="section-divider">الخطوة 1 — رقم المحمول</div>
        <div class="field-grid tight">
          <div class="field span-2">
            <label>رقم المحمول<span class="req">*</span></label>
            <input id="enhanced-agentMobileNumber" name="agentMobileNumber" type="tel" placeholder="05XXXXXXXX" maxlength="10" class="isRequired form-control input-sm">
          </div>
        </div>
        <div id="enhanced-otpCodeDiv" class="section-divider" style="display:none;">الخطوة 2 — رمز التفعيل</div>
        <div id="enhanced-otpFieldWrapper" class="field-grid tight" style="display:none;">
          <div class="field span-2">
            <label for="enhanced-otpCode">أدخل رمز التفعيل المرسل إلى رقم المحمول<span class="req">*</span></label>
            <div class="otp-boxes">
              <input id="enhanced-otpDigit0" class="enhanced-otp-digit" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" />
              <input id="enhanced-otpDigit1" class="enhanced-otp-digit" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" />
              <input id="enhanced-otpDigit2" class="enhanced-otp-digit" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" />
              <input id="enhanced-otpDigit3" class="enhanced-otp-digit" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" />
              <input id="enhanced-otpDigit4" class="enhanced-otp-digit" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" />
            </div>
            <input id="enhanced-otpCode" name="otpCode" type="hidden">
            <span class="field-note" style="margin-top:8px; display:flex; align-items:center; gap:8px;">
              <span id="enhanced-counterIdLabel" style="display:none;color: darkred;">إعادة الإرسال خلال :</span>
              <span id="enhanced-counterId" style="color: darkred;"></span>
            </span>
          </div>
        </div>
      </div>
      <div class="form-card-foot">
        <button id="enhanced-sendOTPBtn" data-toggle="tooltip" data-original-title="متابعة" class="btn-primary" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          متابعة
        </button>
        <button id="enhanced-submitFormBtn" class="btn-primary" type="button" style="display:none;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          متابعة
        </button>
        <button id="enhanced-reSendOTPBtn" data-toggle="tooltip" data-original-title="اعادة ارسال رمز التفعيل" class="btn-secondary" type="button" style="display:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 15a9 9 0 1 0 2.6-8.6L1 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          إعادة إرسال رمز التفعيل
        </button>
        <a class="btn-secondary" href="/agent/businessServices" style="text-decoration:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 6l-6 6 6 6M2 12h20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          الرجوع الى القائمة
        </a>
      </div>
    </div>
  </div>
</div>
${getFooterHTML()}
`;
  return container;
}

enhanceRegistrationPage();
