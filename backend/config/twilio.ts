import twilio from "twilio";

// Phone number to credentials mapping
const ALLOWED_NUMBERS = {
  "9856061375": {
    accountSid: process.env.BIPLOV_ACCOUNT_SID,
    authToken: process.env.BIPLOV_AUTH_TOKEN,
    twilioPhoneNumber: process.env.BIPLOV_TWILIO_PHONE_NUMBER,
  },
  "9868571664": {
    accountSid: process.env.SANDESH_ACCOUNT_SID,
    authToken: process.env.SANDESH_AUTH_TOKEN,
    twilioPhoneNumber: process.env.SANDESH_TWILIO_PHONE_NUMBER,
  },
  "9820496148": {
    accountSid: process.env.SANCHIT_ACCOUNT_SID,
    authToken: process.env.SANCHIT_AUTH_TOKEN,
    twilioPhoneNumber: process.env.SANCHIT_TWILIO_PHONE_NUMBER,
  },
};

async function createMessage(phoneNumber: string, verificationCode: string) {
  // Extract just the digits from the phone number (remove +977 or any country code)
  const cleanNumber = phoneNumber.replace(/\D/g, "").slice(-10);

  // Check if the number is allowed
  const credentials = ALLOWED_NUMBERS[cleanNumber as keyof typeof ALLOWED_NUMBERS];
  
  if (!credentials) {
    throw new Error("Your number is not allowed");
  }
  console.log(credentials.accountSid)
    console.log(credentials.authToken)

  console.log("Phone Number",phoneNumber)

  // Create Twilio client with specific credentials
  const client = twilio(credentials.accountSid, credentials.authToken);

  const message = await client.messages.create({
    body: `Your verification code is ${verificationCode}`,
    from: credentials.twilioPhoneNumber,
    to: phoneNumber,
  });

  console.log("Messaage",message.body);
}

/**
 * Send accident alert SMS to a phone number
 */
export async function sendAccidentAlert(phoneNumber: string, messageBody: string) {
  try {
    // Extract just the digits from the phone number (remove +977 or any country code)
    const cleanNumber = phoneNumber.replace(/\D/g, "").slice(-10);

    // Check if the number is allowed
    const credentials = ALLOWED_NUMBERS[cleanNumber as keyof typeof ALLOWED_NUMBERS];
    
    if (!credentials) {
      console.warn(`Phone number ${phoneNumber} is not in allowed list, skipping SMS`);
      return { success: false, reason: "Number not allowed" };
    }

    // Create Twilio client with specific credentials
    const client = twilio(credentials.accountSid, credentials.authToken);

    const message = await client.messages.create({
      body: messageBody,
      from: credentials.twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log(`✅ SMS sent to ${phoneNumber}: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error);
    return { success: false, error };
  }
}

export default createMessage;