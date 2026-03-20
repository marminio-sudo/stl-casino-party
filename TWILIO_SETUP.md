# SMS Winner Notifications - Twilio Setup

## Prerequisites

1. **Twilio Account**
   - Sign up at https://www.twilio.com (free trial available)
   - Get $15 in free credits
   
2. **Required Credentials**
   - Account SID
   - Auth Token
   - Twilio Phone Number

## Getting Your Twilio Credentials

1. Go to https://console.twilio.com/
2. From the dashboard, copy:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click "Show" to reveal)
3. Go to **Phone Numbers** → **Manage** → **Active numbers**
   - Copy your Twilio phone number (format: +1234567890)

## Deploying the SMS Function to Supabase

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Link to Your Supabase Project

```bash
cd ~/clawd/stl-casino-party
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

### Step 3: Set Twilio Secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

### Step 4: Deploy the Function

```bash
supabase functions deploy send-sms
```

## Testing

1. Go to your event admin dashboard
2. Navigate to the Raffle tab
3. Draw a prize winner
4. Click **"📱 Text Winner"** button
5. The winner will receive an SMS notification!

## SMS Message Format

```
🎉 Congratulations [Name]! You won: [Prize Name] at [Event Name]! 
Please see the event host to claim your prize.
```

## Troubleshooting

**"Function not found" error:**
- Make sure you deployed the function: `supabase functions deploy send-sms`

**"Winner has no phone number" alert:**
- Guest didn't provide phone number during check-in
- Phone number field is required now, so this shouldn't happen for new guests

**SMS not received:**
- Check Twilio console logs: https://console.twilio.com/monitor/logs/sms
- Verify the phone number is in valid E.164 format (+1234567890)
- If using trial account, recipient must be a verified number

## Cost

- Twilio charges ~$0.0075 per SMS in the US
- Free trial includes $15 credit (~2000 messages)
