app.post("/api/send-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const actionCodeSettings = {
      url: process.env.RESET_TARGET_URL, // ví dụ: https://nini-funny.com/reset-password.html
      handleCodeInApp: false,
    };
    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

    // gửi mail qua nodemailer
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Reset your password for NiNi-funny",
      html: `<p>Click this link to reset: <a href="${link}">${link}</a></p>`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
