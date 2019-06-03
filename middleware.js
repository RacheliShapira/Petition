//checks if you are logged out, before the code runs that route
const requireLoggedOutUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/petition");
        return;
    } else {
        next();
    }
};

//if you didnt sign yet, you'll go to petition
const requireSignature = (req, res, next) => {
    if (!req.session.signatureId) {
        res.redirect("/petition");
        return;
    } else {
        next();
    }
};

//if you signed already, you'll go to thankyou
const requireNoSignature = (req, res, next) => {
    if (req.session.signatureId) {
        res.redirect("/thanks");
        return;
    } else {
        next();
    }
};

module.exports = { requireSignature, requireNoSignature, requireLoggedOutUser };
