const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Sequelize = require('sequelize');

// Create an Express application
const app = express();

// This secret will be used to sign and encrypt cookies
const COOKIE_SECRET = 'cookie secret';

//connexion a la base de donnée
const database = new Sequelize('projetdev', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

const User = database.define('user', {
    username : { type: Sequelize.STRING } ,
    email : { type: Sequelize.STRING } ,
    bio : { type: Sequelize.STRING } ,
    role : { type: Sequelize.ENUM('user', 'admin')} , //pou le pug => if user.role === 'admin'
    password : { type: Sequelize.STRING }
});

const Actualite = database.define('actualite', {
    article : { type: Sequelize.STRING } ,
});


const Commentaire = database.define('commentaire', {
    avis: { type: Sequelize.STRING },
});

Actualite.hasMany(Commentaire);
Commentaire.belongsTo(Actualite);

database.sync().then(r => {
    console.log("DB SYNCED");
}).catch(e => {
    console.error(e);
});

// Use Pug for the views
app.set('view engine', 'pug');
// Parse form data content so it's available as an object through
// request.body
app.use(bodyParser.urlencoded({ extended: true }));
// Parse cookies so they're attached to the request as
// request.cookies
app.use(cookieParser(COOKIE_SECRET));

passport.use(new LocalStrategy((username, password, done) => {
    User
        .findOne({
            where: {username, password}
        }).then(function (user) {
        if (user) {
            return done(null, user)
        } else {
            return done(null, false, {
                message: 'Invalid credentials'
            });
        }
    })
        .catch(done);
}));

passport.serializeUser((user, cookieBuilder) => {
    cookieBuilder(null, user.username);
});

passport.deserializeUser((username, cb) => {
    console.log("AUTH ATTEMPT",username);
    // Fetch the user record corresponding to the provided email address
    User.findOne({
        where : { username }
    }).then(r => {
        if(r) return cb(null, r);
        else return cb(new Error("No user corresponding to the cookie's email address"));
    });
});

// Parse cookies so they're attached to the request as
// request.cookies
app.use(cookieParser(COOKIE_SECRET));

// Parse form data content so it's available as an object through
// request.body
app.use(bodyParser.urlencoded({ extended: true }));

// Keep track of user sessions
app.use(session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Initialize passport, it must come after Express' session() middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    if (req.user) {
        Actualite.findAll({include:[Commentaire]}).then((actualites) => {
            res.render('home', {
                actualites: actualites,
                user: req.user
            });
        });



    } else {
        User.findAll().then((users) => {
            res.render('home', {
                users: users
            });
        });
    }
});


app.get('/connexion', (req, res) => {
    // Render the login page
    res.render('connexion');
});




app.post('/connexion',
    // Authenticate user when the login form is submitted
    passport.authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/connexion'
    })
);

app.get('/commentaire',(req,res) => {
    res.render('commentaire');
});

app.post('/commentaire/:actualiteId', (req, res) => {
    const { avis } = req.body;
    Commentaire
        .sync()
        .then(() => Commentaire.create({ avis, actualiteId: req.params.actualiteId, userId: req.user.id }))
        .then(() => res.redirect('/'));
});


app.get('/new', (req, res) => {
    // Render the new page
    res.render('new');
});

app.post('/new', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const bio = req.body.bio;
    const role = req.body.role;
    
    User
        .create({
            username: username,
            password: password,
            email: email,
            bio: bio,
            role: role
        })
        .then((user) => {
            req.login(user, () => {
                res.redirect('/');
            })
        })
});

app.get('/question', (req, res) => {
    // Render the login page
    res.render('question');
});

app.post('/question', (req, res) => {
    const article = req.body.article;
    Actualite
        .create({
            article: article,
        })
        .then((actualite) => {
            req.login(actualite, () => {
                res.redirect('/');
            })
        })
});




app.listen(3000);