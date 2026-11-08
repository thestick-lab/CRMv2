const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Deadlines'));
if (btn) btn.click();
