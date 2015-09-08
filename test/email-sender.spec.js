var emailSender = require('../helpers/email-sender')({
  service: 'Gmail',
  auth: {
    user: process.env.NODE_APP_EMAILSENDER_EMAIL,
    pass: process.env.NODE_APP_EMAILSENDER_PASSWORD
  }
});

describe('email-sender.js', function() {
  it('should load content from url', function() {
    return emailSender.sendActivationEmail({
      email: 'efidiles.public@gmail.com',
      token: 'testtoken-000000-000000000000000'
    });
  });
});
