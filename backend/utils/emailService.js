const nodemailer = require("nodemailer");

const sendCredentialsEmail = async (email, name, password,role = "Staff Member") => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "aswinhareesh1991@gmail.com", // Replace with your email
        pass: "jydr zizx dvyv ntye",     // Replace with your App Password
      },
      // 👇 ADD THIS BLOCK TO FIX THE CERTIFICATE ERROR
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: '"Logistics Admin" <no-reply@logistics.com>',
      to: email,
      subject: `Your ${role === 'driver' ? 'Driver' : 'Manager'} Account Credentials`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${name},</h2>
          <p>You have been added as a ${role === 'driver' ? 'driver' : 'Manager'} to the Logistics Tracking System.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p>Please login and change your password immediately.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${email}`);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

module.exports = { sendCredentialsEmail };