/**
 * http://usejsdoc.org/
 */
const passport= require("passport");
const SamlStrategy = require("passport-saml").Strategy;
const config = require("./config.json");
const fs = require('fs');

const cert = fs.readFileSync(config.cert, 'utf-8');

let users = [];

function findByNameId(nameId, fn){
	for (let i =0, len = users.length; i <len; i ++){
		let user = users[i];
		if(user.nameID == nameId){
			return fn(null, user);
		}
	}
	return fn(null, null);
}

//Passport session setup.
//To support persistent login sessions, Passport needs to be able to
//serialize users into and deserialize users out of the session.  Typically,
//this will be as simple as storing the user ID when serializing, and finding
//the user by ID when deserializing.
passport.serializeUser(function(user, done) {
		done(null, user.nameID);
	});

passport.deserializeUser(function(id, done) {
	findByNameId(id, function(err, user) {
	   done(err, user);
		});
	});

passport.use(new SamlStrategy({
	issuer:config.issuer,
	path: '/login/callback',
	entryPoint: config.entryPoint,
	cert: cert
	},
	(profile, done) => {
		console.log('Succesfully profile  ' + JSON.stringify(profile));
		if(!profile.nameID){
			return done(new Error("No nameId found", null));
		}
		
		process.nextTick(function(){
			console.log('process.nexTick '+ JSON.stringify(profile));
			findByNameId(profile.nameID, function(err, user){
				if(err){
					console.log("Error "+ JSON.stringofy(err));
					return done(err);
				}
				if (!user){
					console.log("No users, push profile to users");
					users.push(profile);
					return done(null, profile);
				}
				console.log('Ending Method for profiling');
				return done(null, user);
			})
		});
	}
));

passport.protected = function protected(req, res, next){
	console.log('Login Profile ' + req.isAuthenticated());
	if (req.isAuthenticated()){
		return next();
	}
	console.log('login please '+ req.isAuthenticated());
	res.redirect('/login');
	
}

exports = module.exports = passport;