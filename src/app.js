const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool } = require("./config/db");
const { attachCurrentUser } = require("./middleware/currentUser");
const { loadUser } = require("./middleware/auth");
require("dotenv").config();

const webRoutes = require("./routes/web.routes");
const adminRoutes = require("./routes/admin.routes");
const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "change_me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

app.use(attachCurrentUser);
app.use(loadUser);

app.use("/", webRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => res.status(404).render("pages/404", { title: "404" }));

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
