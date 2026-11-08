const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Clients'));
if (btn) btn.click();
