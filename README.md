# Interactive Test Book

A modern, responsive and user-friendly **interactive test management tool** built with React and Vite.

## ✨ Features

- **Add, view, and remove test cases** with:
  - Auto-incremented test IDs (`TC001`, `TC002`, etc.)
  - Description, expected data, datasets (in JSON), and status
- **Live test monitoring dashboard:** 
  - Total tests
  - To do
  - Success
  - Failed
- **Elegant UI/UX**:
  - Modern design
  - Responsive layout (desktop & mobile)
  - Inline modal for adding tests
  - Discrete dashboard stats
- **Zero backend**: Data managed in browser memory (no database)
- **Easy to extend**: Pure React code, simple to hack or evolve

## 🚀 Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/Ordovicien/Test-react.git
cd Test-react
```

### 2. Install dependencies

```sh
npm install
```

### 3. Start the development server

```sh
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for production

```sh
npm run build
```

## 🖥️ Deployment

- Supports deployment to **GitHub Pages** (or any static hosting).
- Example:
  ```sh
  npm run build
  npm install -D gh-pages
  npm run deploy
  ```
  _(Configure your `vite.config.js` base path if deploying to a subdirectory!)_

## 📁 Project Structure

```
/src
  App.jsx       # Main React component
  App.css       # All styles
  ...
/public         # Static assets (if any)
index.html
vite.config.js
...
```

## ⚙️ Customization

- **Design**: Change styles in `App.css`
- **Features**: Edit or extend `App.jsx`
- **Persistence**: Add localStorage or backend for real data saving

## 🙌 Credits

- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- UI/UX inspired by modern SaaS dashboards

---

**Feel free to open Issues or Pull Requests!**  
Enjoy testing 🚀
