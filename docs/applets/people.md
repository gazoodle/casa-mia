# People

Who is known to the home.

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](../README.md#maturity))

<img src="../screenshots/people.webp" alt="People" width="800">

## What it's for

Keep the list of phone numbers allowed to call or text your home through
[Phone and SMS](phone-and-sms.md). Each person has one number and separate permissions
for calls and texts. Numbers outside the list, withheld numbers and calls or texts
without the corresponding permission are reported as intrusions.

This is Casa Mia's phone permission list. Linking an entry to a Home Assistant person
does not create a user, change that user's permissions or set up presence tracking.

## Switching it on

People is always available in the Casa Mia panel; there is no People switch in the
app's Configuration tab. Open **People** and add the people who should be known.

To receive calls or texts, set up the FONA hardware and enable **Phone and SMS (FONA)**.
You can prepare and check the permission list before the hardware is connected.

## On the page

### People

Press **+ Add person** and enter:

- **Name:** the name shown in events and, for a known number, the app's PONG reply.
- **Phone number:** one number, such as `07700 900123` or `+44 7700 900123`.
- **May call** and **May text:** independent permissions. New entries start with both
  ticked; clear either one if it is not wanted.
- **Home Assistant person:** an optional link to an existing person in Home Assistant.

Press **Save** in the dialog. **Edit** changes the name, number or link; the **Call** and
**Text** ticks in the list save immediately. **Remove** deletes the Casa Mia entry after
confirmation, so its future calls and texts become intrusions. It does not delete the
linked Home Assistant person.

UK national and international forms match the same stored number. Numbers beginning
with `0` are treated as UK numbers; for other countries, enter the full international
number with `+` and its country code. A number can belong to only one entry.

### Check a number

Enter a number and press **Check** to see how a call and a text would each be treated,
including the normalised number and any reason for refusal. This is a lookup: it does
not make a call or send a text. For example, Ann can be allowed to text while a call
from the same number is an intrusion.

## In Home Assistant

The optional person link is stored with the entry. The phone permissions are used by
FONA's **Call** and **Text** events; they do not create separate entities for each
person. Your automations choose what to do with an authorised event or an intrusion.

## Troubleshooting

- **A known number is an intrusion.** Use **Check a number** with the number reported
  by FONA. Check the Call or Text tick and the country code. The result distinguishes
  `unknown number`, `not allowed to call`, `not allowed to text` and `number withheld`.
- **The number cannot be saved.** Use a dialable number in national UK or international
  form. The page reports invalid numbers and a number already belonging to another
  person; edit that entry instead of adding a duplicate.
- **Home Assistant's people cannot be read.** The optional link field shows the error.
  You can still save an unlinked phone entry; check Home Assistant's connection before
  trying to select a person again.
- **The page says people.json could not be read.** The app deliberately authorises
  nobody and refuses edits rather than overwriting the unreadable store. The log says
  `cannot read …, nobody is authorised` with the cause. Restore the app's data from a
  backup or repair the file, then restart. Removing the file starts an empty list, so
  keep a recovery copy before doing that.

Changes are logged as `saved … (calls …, texts …)`. The FONA log records each real call
or text and its verdict. Remove names, phone numbers and message contents before
sharing logs in a public issue.
