import init, { verify } from './bip322.js';

async function runVerification(event) {
    event.preventDefault();

    const address = document.getElementById('address').value;
    const message = document.getElementById('message').value;
    const signature = document.getElementById('signature').value;

    const result = verify(address, message, signature);
    console.log(result);

    document.getElementById('verify-form').style.display = 'none';
    const resultElement = document.getElementById('verify');
    resultElement.textContent = result;
    resultElement.style.display = 'block';
}

function showForm() {
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('bip').classList.add('hidden');
    document.getElementById('verify-form').classList.add('visible');
}

function handleFocus(event) {
    if (event.target.value === event.target.getAttribute('data-default')) {
        event.target.value = '';
    }
}

function handleBlur(event) {
    if (event.target.value === '') {
        event.target.value = event.target.getAttribute('data-default');
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        runVerification(event);
    }
}

await init();

document.getElementById('bip').addEventListener('click', showForm);
document.getElementById('verify-form').addEventListener('submit', runVerification);

const inputs = document.querySelectorAll('#verify-form input');
inputs.forEach(input => {
    const defaultValue = input.value;
    input.setAttribute('data-default', defaultValue);
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keypress', handleKeyPress);
});
