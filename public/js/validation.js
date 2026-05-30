// ================================================================
// ВАЛИДАЦИЯ ФОРМ: EMAIL, ТЕЛЕФОН, ПАРОЛЬ
// ================================================================

// Форматирование телефона: +7 (999) 999-99-99
function formatPhone(value) {
  if (!value) return '';
  let cleaned = value.replace(/\D/g, '');
  
  // Если начинает с 8 или 9, добавляем 7 в начало
  if (cleaned[0] === '8') cleaned = '7' + cleaned.slice(1);
  if (cleaned[0] === '9') cleaned = '7' + cleaned;
  
  // Ограничиваем 11 цифрами (для +7)
  if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
  
  // Форматируем
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 1) return '+' + cleaned;
  if (cleaned.length <= 3) return '+' + cleaned[0] + ' (' + cleaned.slice(1);
  if (cleaned.length <= 6) return '+' + cleaned[0] + ' (' + cleaned.slice(1, 4) + ') ' + cleaned.slice(4);
  if (cleaned.length <= 8) return '+' + cleaned[0] + ' (' + cleaned.slice(1, 4) + ') ' + cleaned.slice(4, 7) + '-' + cleaned.slice(7);
  
  return '+' + cleaned[0] + ' (' + cleaned.slice(1, 4) + ') ' + cleaned.slice(4, 7) + '-' + cleaned.slice(7, 9) + '-' + cleaned.slice(9, 11);
}

// Инициализация маски для поля телефона
function initPhoneMask(inputSelector) {
  const phoneInput = document.querySelector(inputSelector);
  if (!phoneInput) return;
  
  // Форматируем существующее значение при загрузке
  if (phoneInput.value) {
    phoneInput.value = formatPhone(phoneInput.value.replace(/\D/g, ''));
  }
  
  // Форматируем при вводе
  phoneInput.addEventListener('input', function (e) {
    e.target.value = formatPhone(e.target.value.replace(/\D/g, ''));
  });
}

// Валидация email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Валидация номера телефона (11 цифр для России)
function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 11 && cleaned[0] === '7';
}

// Валидация пароля
function validatePassword(password) {
  return password && password.length >= 8;
}

// Получение сообщения об ошибке для пароля
function getPasswordErrorMessage(password) {
  if (!password) return 'Пароль не должен быть пустым';
  if (password.length < 8) return 'Пароль должен быть не менее 8 символов';
  return '';
}

// Добавление/удаление error-класса к input
function setInputError(input, hasError, message) {
  if (hasError) {
    input.classList.add('input--error');
    let errorSpan = input.parentElement.querySelector('small.error-msg');
    if (!errorSpan) {
      errorSpan = document.createElement('small');
      errorSpan.className = 'error-msg';
      input.parentElement.appendChild(errorSpan);
    }
    errorSpan.textContent = message;
  } else {
    input.classList.remove('input--error');
    const errorSpan = input.parentElement.querySelector('small.error-msg');
    if (errorSpan) errorSpan.remove();
  }
}

// Валидация при фокусе/размытии
function setupFieldValidation(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  
  const emailInputs = form.querySelectorAll('input[type="email"]');
  const phoneInputs = form.querySelectorAll('input[type="tel"], input[name="phone"]');
  const passwordInputs = form.querySelectorAll('input[type="password"]');
  
  // Email
  emailInputs.forEach(input => {
    input.addEventListener('blur', function () {
      if (this.value && !validateEmail(this.value)) {
        setInputError(this, true, 'Введите корректный email');
      } else {
        setInputError(this, false);
      }
    });
  });
  
  // Телефон
  phoneInputs.forEach(input => {
    input.addEventListener('blur', function () {
      if (this.value && !validatePhone(this.value)) {
        setInputError(this, true, 'Введите корректный номер телефона');
      } else {
        setInputError(this, false);
      }
    });
  });
  
  // Пароль
  passwordInputs.forEach(input => {
    input.addEventListener('blur', function () {
      if (this.value) {
        const error = getPasswordErrorMessage(this.value);
        if (error) {
          setInputError(this, true, error);
        } else {
          setInputError(this, false);
        }
      }
    });
  });
}

// Полная валидация формы перед отправкой
function validateForm(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return true;
  
  let isValid = true;
  
  // Проверка email
  const emailInputs = form.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    if (input.value && !validateEmail(input.value)) {
      setInputError(input, true, 'Введите корректный email');
      isValid = false;
    }
  });
  
  // Проверка телефона
  const phoneInputs = form.querySelectorAll('input[type="tel"], input[name="phone"]');
  phoneInputs.forEach(input => {
    if (input.required || input.value) {
      if (!validatePhone(input.value)) {
        setInputError(input, true, 'Введите корректный номер телефона (11 цифр)');
        isValid = false;
      }
    }
  });
  
  // Проверка пароля
  const passwordInputs = form.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    if (input.required || input.value) {
      const error = getPasswordErrorMessage(input.value);
      if (error) {
        setInputError(input, true, error);
        isValid = false;
      }
    }
  });
  
  return isValid;
}

// Установка обработчика на submit
function setupFormValidation(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  
  form.addEventListener('submit', function (e) {
    if (!validateForm(formSelector)) {
      e.preventDefault();
      return false;
    }
  });
}

// CSS для error-состояния
function injectStyles() {
  if (document.getElementById('validation-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'validation-styles';
  style.textContent = `
    .input--error {
      border-color: #E30613 !important;
      background-color: #fff5f5 !important;
    }
    
    .error-msg {
      display: block !important;
      color: #E30613;
      font-size: 12px;
      margin-top: 4px;
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function () {
  injectStyles();
});
