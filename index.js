const express = require("express");
const hb = require("express-handlebars");
const app = express();
const db = require("./db");
const bcrypt = require("./bcrypt");
const security = require("./security");
const cookieSession = require("cookie-session");
const csurf = require("csurf");

const {
    requireLoggedOutUser,
    requireSignature,
    requireNoSignature
} = require("./middleware");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(require("body-parser").urlencoded({ extended: false }));

app.use(
    cookieSession({
        secret: `Not today Hackers`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());
app.use(express.static(__dirname + "/public"));

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    res.setHeader("X-Frame-Options", "DENY");
    next();
});

//redirects:

app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get("/home", requireLoggedOutUser, (req, res) => {
    res.render("home", {
        layout: "main"
    });
});

app.use(function(req, res, next) {
    if (!req.session.userId && req.url != "/register" && req.url != "/login") {
        res.redirect("/home");
    } else {
        next();
    }
});

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("register", {
        layout: "main"
    });
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    bcrypt
        .hash(req.body.password)
        .then(hashedPassword => {
            return db.registerUser(
                req.body.first,
                req.body.last,
                req.body.email,
                hashedPassword
            );
        })
        .then(({ rows }) => {
            req.session.userId = rows[0].id;
            req.session.first = rows[0].first;
            req.session.last = rows[0].last;
            res.redirect("/profile");
        })
        .catch(err => {
            console.log("error in register: ", err);
            res.render("register", {
                error: true,
                layout: "main"
            });
        });
});

app.get("/profile", (req, res) => {
    res.render("profile", {
        layout: "main",
        name: req.session.first
    });
});

app.post("/profile", (req, res) => {
    security
        .checkUrl(req.body.homepage)
        .then(url => {
            db.updateProfile(
                req.body.age,
                req.body.city,
                url,
                req.session.userId
            );
        })
        .then(() => {
            res.redirect("/petition");
        })
        .catch(err => {
            console.log("error in profile: ", err);
            res.render("profile", {
                error: true,
                name: req.session.first,
                layout: "main"
            });
        });
});

app.post("/delete", (req, res) => {
    db.deleteSignatureRow(req.session.userId)
        .then(() => {
            db.deleteProfileRow(req.session.userId);
        })
        .then(() => {
            db.deleteUserRow(req.session.userId);
        })
        .then(() => {
            res.redirect("/bye");
        })
        .catch(err => {
            console.log("error in delete: ", err);
        });
});

app.get("/edit", (req, res) => {
    db.getProfileInfo(req.session.userId).then(dbInfo => {
        res.render("edit", {
            layout: "main",
            first: dbInfo.rows[0].first,
            last: dbInfo.rows[0].last,
            email: dbInfo.rows[0].email,
            age: dbInfo.rows[0].age || null,
            city: dbInfo.rows[0].city || null,
            homepage: dbInfo.rows[0].url || null
        });
    });
});

app.post("/edit", (req, res) => {
    var url;
    function errorDisplay(err) {
        console.log("error: ", err);
        db.getProfileInfo(req.session.userId).then(dbInfo => {
            res.render("edit", {
                layout: "main",
                first: dbInfo.rows[0].first,
                last: dbInfo.rows[0].last,
                email: dbInfo.rows[0].email,
                age: dbInfo.rows[0].age || null,
                city: dbInfo.rows[0].city || null,
                homepage: dbInfo.rows[0].url || null,
                error: true
            });
        });
    }
    security
        .checkUrl(req.body.homepage)
        .then(resultUrl => {
            url = resultUrl;
            if (req.body.password !== "") {
                bcrypt.hash(req.body.password).then(hashedPassword => {
                    Promise.all([
                        db.updateUserWithPassword(
                            req.body.first,
                            req.body.last,
                            req.body.email,
                            hashedPassword,
                            req.session.userId
                        ),
                        db.updateProfile(
                            req.body.age,
                            req.body.city,
                            url,
                            req.session.userId
                        )
                    ])
                        .then(() => {
                            req.session.first = req.body.first;
                            req.session.last = req.body.last;
                            res.redirect("/thanks");
                        })
                        .catch(err => {
                            errorDisplay(err);
                        });
                });
            } else {
                Promise.all([
                    db.updateUserWithoutPassword(
                        req.body.first,
                        req.body.last,
                        req.body.email,
                        req.session.userId
                    ),
                    db.updateProfile(
                        req.body.age,
                        req.body.city,
                        url,
                        req.session.userId
                    )
                ])
                    .then(() => {
                        req.session.first = req.body.first;
                        req.session.last = req.body.last;
                        res.redirect("/thanks");
                    })
                    .catch(err => {
                        errorDisplay(err);
                    });
            }
        })
        .catch(err => {
            errorDisplay(err);
        });
});

app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login", {
        layout: "main"
    });
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    db.getUserInfo(req.body.email)
        .then(dbInfo => {
            req.session.userId = dbInfo.rows[0].id;
            req.session.first = dbInfo.rows[0].first;
            req.session.last = dbInfo.rows[0].last;
            //req.session.signatureId = {};
            if (dbInfo.rows[0].password) {
                return bcrypt.compare(
                    req.body.password,
                    dbInfo.rows[0].password
                );
            }
        })
        .then(() => {
            res.redirect("/thanks");
        })
        .catch(err => {
            console.log(err.message);
            res.render("login", {
                errorMessage: "email is not registered.",
                layout: "main"
            });
        });
});

//
app.get("/petition", requireNoSignature, (req, res) => {
    res.render("petition", {
        layout: "main",
        name: req.session.first
    });
});

app.post("/petition", requireNoSignature, (req, res) => {
    db.addSignature(req.body.sig, req.session.userId)
        .then(function({ rows }) {
            req.session.signatureId = rows[0].id;
            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log(err);
            res.render("thanks", {
                error: true,
                layout: "main"
            });
        });
});

app.get("/thanks", requireSignature, (req, res) => {
    db.getSignature(req.session.signatureId)
        .then(function(sig) {
            res.render("thanks", {
                signature: sig.rows[0].sig,
                layout: "main",
                name: req.session.first
            });
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.post("/thanks", (req, res) => {
    db.removeSignature(req.session.userId)
        .then(() => {
            req.session.signatureId = null;
        })
        .then(() => {
            res.redirect("/petition");
        })
        .catch(err => {
            console.log("error when removing signature: ", err);
        });
});

app.get("/signers", requireSignature, (req, res) => {
    db.getSigners().then(function(signers) {
        res.render("signers", {
            signers: signers.rows,
            layout: "main",
            name: req.session.first
        });
    });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/home");
});

app.listen(process.env.PORT || 3000, () => console.log("Listening!"));
// app.listen(3000, () => console.log("listening!!!!!!!!!!!!!!!!!!!!!!!!!!!"));
