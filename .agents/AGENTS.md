# Browser Automation Rules for Login and Registration Form Fields

1. **Check for existing text**: Before typing any value into email or password fields, always check whether the input fields already contain any text/value.
2. **Clear before typing**: If any text exists in the target input field, focus the input and clear it completely using `Ctrl + A` followed by `Backspace` or `Delete`.
3. **Never append**: Do not append new values to existing values.
4. **Clean retry**: If a login attempt fails, clear both fields completely before attempting to type the credentials again.
5. **Universal application**: Apply these rules to every automated browser task in this repository.
