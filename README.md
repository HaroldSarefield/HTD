# HTD — Harry's To Do

A free planner for school, college, Lawn Lads, volunteering, health and training. Everything runs on your Mac; no accounts and no paid services.

## Website
**https://haroldsarefield.github.io/HTD/**, protected by a password. It works the same way as the Storage Unit editor password: the GitHub access token is saved in the repo encrypted with your password. Unlike Storage Unit, all your tasks are encrypted too, so nothing is readable without the password. Encrypted data lives on the `data` branch, so saving doesn't rebuild the site.

Updating the site after code changes: `git push` (GitHub Pages rebuilds in about a minute).

## Run it on your Mac

```bash
cd ~/HTD && python3 server.py
```

Then open http://localhost:8765.

## Pages (top bar)
- **Main:** the add box, Today (now / schedule / top priorities), an overview card for each area, and what's coming up.
- **Review:** weekly check-in. Overdue tasks with one-click reschedule, what's due in the next 7 days, tasks with no date, what you finished, and progress by area.
- **Calendar:** month view, or a 3-week view, with every deadline, task, job and workout on its day. Tap a day for details.
- **School:** split into your six classes (A day and B day), each with its own tasks and next class date, plus general school tasks, the next 10 school days, key dates and Canvas sync.
- **College:** one section per school (status, notes, tasks), scholarships, and general college tasks.
- **Lawn Lads:** jobs for the next 3 weeks, business tasks, and Jobber sync.
- **Volunteering:** NHS and Beta side by side (hours, rules, forms, tasks), logging hours, Beta events and Beta Con.
- **Health:** daily habits and a 4-week history.
- **Training:** this week's workouts, race setup, long runs ahead, and the road to Ironman.
- **Settings:** bell times, links, Outlook sync, and backup.

## The add box
Type or tap **Speak** and say what you need in your own words, e.g.
"gotta finish the bio lab by friday, mow the hendersons sat at 9, and ask mrs k for a rec letter".
HTD splits that into separate items, cleans up the wording ("Finish Bio lab", "Mow Hendersons", "Ask Mrs. K for a recommendation letter"), picks the area, and finds dates and times. You review before anything is added. It's all done on your computer for free; it's rule-based, so double-check the review list.

Voice uses the browser's built-in speech recognition (Chrome or Safari). Mac dictation (press fn twice) also works in the box.

## Connecting calendars
- **Canvas:** Calendar → Calendar Feed link → School page. Assignments become tasks, sorted into classes by name.
- **Jobber:** its calendar sync link, or Jobber → Google Calendar → that calendar's secret iCal address → Lawn Lads page.
- **Outlook:** Settings → Calendar → Shared calendars → Publish → ICS link → Settings page (school accounts may block this).

Data lives in your browser. Use Settings → Export now and then.

Files: `core.js` (planner, smart add, data logic), `ui.js` (pages), `server.py` (local server + calendar proxy), `data.js` (school/club facts and starting tasks).
