const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Sequelize = require('sequelize');


// Create an Express application
const app = express();

app.locals.moment = require('moment');
app.locals.moment.locale('fr');


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
    role : { type: Sequelize.ENUM('admin', 'utilisateur' ), defaultValue: 'utilisateur' } ,
    password : { type: Sequelize.STRING }
});

const Actualite = database.define('actualite', {
    title: { type : Sequelize.STRING},
    content: { type: Sequelize.STRING },
    resolvedAt: { type: Sequelize.DATE },
});


const Commentaire = database.define('commentaire', {
    avis: { type: Sequelize.STRING },
});

Actualite.hasMany(Commentaire);
Commentaire.belongsTo(Actualite);

User.hasMany(Commentaire);
Commentaire.belongsTo(User);

User.hasMany(Actualite);
Actualite.belongsTo(User);


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
app.use(express.static('public'));

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



app.get('/',(req,res) => {
    Actualite
        .sync()
        .then(() => {
            Actualite
                .findAll({include:[{model: Commentaire,include:[User]}, User ]})
                .then((actualites) => {
                    console.log(actualites);
                    res.render( 'home', { actualites, user : req.user});
                })
        })

});




app.get('/profile/:userId', (req, res) => {
    const { username, bio, email, password} = req.body;
    User
        .sync()
        .then(() => User.findOne({where: {id: req.params.userId} , User }))
        .then((user) => res.render('profile', {user, user: req.user}));
});


app.get('/question', (req, res) => {
    res.render('question');
});

app.post('/question', (req, res) => {
    const { title, content } = req.body;
    Actualite
        .sync()
        .then(() => Actualite.create({ title, content, userId: req.user.id }))
        .then(() => res.redirect('/'));
});

app.get('/connexion', (req, res) => {
    // Render the login page
    res.render('connexion');
});




app.post('/connexion',
    // Authenticate user when the login form is submitted
    passport.
    authenticate('local', {
        // If authentication succeeded, redirect to the home page
        successRedirect: '/',
        // If authentication failed, redirect to the login page
        failureRedirect: '/connexion'
    })
);

app.get('/affichage/:actualiteId', (req, res) => {
    const { title, content } = req.body;
    Actualite
        .sync()
        .then(() => Actualite.findOne({where: {id: req.params.actualiteId} , include:[{model: Commentaire,include:[User]}, User ]}))
        .then((actualite) => res.render('affichage', {actualite, user: req.user}));
});

app.post('/affichage/:actualiteId/resolved', (req, res) => {
    console.log('yes')
    Actualite
        .sync()
        .then(() => Actualite.update({ resolvedAt: new Date()}, {where: {id: req.params.actualiteId}}))
        .then(()=> res.redirect('/'));
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

app.get('/admin', (req, res) => {
    // Render the new page
    res.render('admin');
});

app.post('/new', (req, res) => {
    const { username, bio, email, password} = req.body;
    User
        .sync()
        .then(() => {return User.count()})
        .then((count) =>
        { let role = 'utilisateur'
            if (count == 0){
                role = 'admin'
            }
            User.create({ username, bio, role, email, password})
        })
        .then(() => res.redirect('/'));
});

app.get('/deco', (req, res) => {
    req.logout();
    res.redirect('/');
});




    app.listen(3000);