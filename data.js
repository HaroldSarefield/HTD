// HTD — Harry's To Do
// Built-in reference data. Things you'll want to change live in Settings
// inside the app; this file holds the researched facts and starting tasks.

window.HTD_DATA = {
  // ---------------- School ----------------
  school: {
    name: "John T. Hoggard High School",
    // A/B rotation anchor: Thursday Nov 19, 2026 was a B day.
    abAnchor: { date: "2026-11-19", day: "B" },
    classes: {
      A: [
        { key: "tok", period: 1, name: "TOK", full: "IB Theory of Knowledge" },
        { key: "hoa", period: 2, name: "IB HOA", full: "IB History of the Americas" },
        { key: "math", period: 3, name: "Math Analysis", full: "IB Math: Analysis & Approaches" },
      ],
      B: [
        { key: "sehs", period: 1, name: "Sports Exercise", full: "IB Sports, Exercise & Health Science" },
        { key: "english", period: 2, name: "English", full: "IB English" },
        { key: "bio", period: 3, name: "Bio", full: "IB Biology" },
      ],
    },
    // NHCS 2026-27 Traditional calendar (agendahero.com listing of the
    // district calendar; check nhcs.net if something looks off).
    noSchool: {
      "2026-09-07": "Labor Day",
      "2026-10-26": "Teacher workday",
      "2026-11-03": "Election Day — teacher workday",
      "2026-11-11": "Veterans Day",
      "2026-11-25": "Teacher workday",
      "2026-11-26": "Thanksgiving",
      "2026-11-27": "Thanksgiving",
      "2026-12-21": "Teacher workday",
      "2026-12-22": "Winter break",
      "2026-12-23": "Winter break",
      "2026-12-24": "Winter break",
      "2026-12-25": "Winter break",
      "2026-12-28": "Winter break",
      "2026-12-29": "Winter break",
      "2026-12-30": "Winter break",
      "2026-12-31": "Winter break",
      "2027-01-01": "New Year's Day",
      "2027-01-18": "MLK Day",
      "2027-01-19": "Teacher workday",
      "2027-02-15": "Teacher workday",
      "2027-03-25": "Teacher workday",
      "2027-03-26": "Good Friday",
      "2027-03-29": "Spring break",
      "2027-03-30": "Spring break",
      "2027-03-31": "Spring break",
      "2027-04-01": "Spring break",
      "2027-04-02": "Spring break",
      "2027-05-31": "Memorial Day",
    },
    firstDay: "2026-08-24",
    lastDay: "2027-06-04",
    keyDates: [
      { date: "2026-12-03", label: "Interim reports" },
      { date: "2027-01-15", label: "End of Q2 / fall semester" },
      { date: "2027-01-25", label: "Report cards" },
      { date: "2027-02-22", label: "Interim reports" },
      { date: "2027-03-23", label: "End of Q3" },
      { date: "2027-04-07", label: "Report cards" },
      { date: "2027-05-03", label: "Interim reports" },
      { date: "2027-06-04", label: "Last day (half day)" },
      { date: "2027-06-05", label: "Graduation" },
    ],
  },

  // ---------------- Volunteering ----------------
  clubs: {
    nhs: {
      name: "NHS — Viking Chapter",
      site: "https://www.jthhonorsociety.org/",
      hoursPerYear: 20,
      gpa: "3.6 unweighted",
      rules: [
        "20 service hours per year (sponsored, approved unsponsored, or your Individual Project).",
        "Submit the Validation Form within 48 hours of every event, with a photo of you participating. Signing up alone doesn't log hours.",
        "Fall hours and validation forms are due January 15, 2027.",
        "GPAs are checked at the end of each semester.",
      ],
      deadlines: [{ date: "2027-01-15", label: "NHS fall hours due" }],
      validationHours: 48,
      links: [
        { label: "Validation form", url: "https://docs.google.com/forms/d/e/1FAIpQLScUIrWWqzVdeAHumUk542qSpsuQGpCcp4OUkuavulrDlzsB7g/viewform" },
        { label: "Check my hours", url: "https://docs.google.com/forms/d/e/1FAIpQLSfPfwKGfzWDCmNzUuzzWyvb9x3Eoq23e0bu8XRRgc-zVa1cVw/viewform" },
        { label: "Unsponsored hours form", url: "https://docs.google.com/forms/d/e/1FAIpQLSfsqx0a4zJvnvELBqAAWlIgGaGhFw-5yPvpQ_RZ6_0CJjtjvg/viewform" },
        { label: "Individual project form", url: "https://docs.google.com/forms/d/e/1FAIpQLScLo8HwK8lfKq0IcySUL47bRid1J9Wt-naiTiB1ClmEcjVbxw/viewform" },
        { label: "Event interest form", url: "https://docs.google.com/forms/d/e/1FAIpQLSfL0ufIuCNC8CKBPYTWfmknIhto9IcHR83bCUWk-SNVtUXY_A/viewform" },
        { label: "Chapter site", url: "https://www.jthhonorsociety.org/" },
      ],
    },
    beta: {
      name: "Beta Club",
      site: "https://www.hoggardbetaclub.org/",
      hoursPerYear: 20,
      eventsPerSemester: 2,
      gpa: "3.6 unweighted / 3.8 weighted",
      rules: [
        "20 hours per year and 2 Beta events per semester.",
        "Submit hours within 1 week of the event — late submissions don't count.",
        "Only 2 hours per semester can come from item drives.",
        "Up to 5 hours over the fall requirement roll over to spring.",
        "Fall semester log due January 15, 2027.",
      ],
      deadlines: [{ date: "2027-01-15", label: "Beta fall log due" }],
      validationHours: 168,
      links: [
        { label: "Submit hours", url: "https://docs.google.com/forms/d/e/1FAIpQLSdAr0aXqRAeMNiUTWmObl5WPszAWRVJYSPBhBOW3EC2kFQvPA/viewform" },
        { label: "Event sign-ups", url: "https://www.hoggardbetaclub.org/" },
      ],
      events: [
        { date: "2026-11-26", title: "Cape Fear Habitat Turkey Trot — course monitor", url: "https://www.signupgenius.com/go/4090449ADA928A5FC1-66031696-cape" },
        { date: "2026-12-03", title: "Bradley Creek Snow Much Fun Night", url: "https://www.signupgenius.com/go/4090449ADA928A5FC1-67394282-bradely" },
        { date: "2026-12-05", title: "Wilmington Historic Half, 10K & 5K — aid stations", url: "https://runsignup.com/Race/Volunteer/NC/Wilmington/RunHistoricWilmington" },
        { date: "2026-12-06", title: "YMCA race — course & finish line", url: "https://ymcasenc.volunteermatters.org/project-catalog/62" },
        { date: "2026-11-21", end: "2026-12-15", title: "Winter Park Optimist Christmas Tree Lot (daily)", url: "https://www.signupgenius.com/go/4090449ADA928A5FC1-67499078-winter" },
        { recurring: "3rd Tuesday", title: "Pine Valley Methodist 49ers meal", url: "https://www.signupgenius.com/go/4090449ADA928A5FC1-65222472-pine" },
      ],
      betaCon: [
        { date: "2026-12-02", label: "Beta Con registration deadline" },
        { date: "2026-12-03", label: "Beta Con testing window opens (to Dec 10)" },
        { date: "2026-12-30", label: "Beta Con hotel deadline" },
        { date: "2027-01-28", label: "NC State Beta Convention, Greensboro (Jan 28–30)" },
      ],
    },
  },

  // ---------------- College ----------------
  colleges: [
    { id: "ncsu", name: "NC State", status: "Applied", portal: "https://admissions.ncsu.edu/" },
    { id: "unc", name: "UNC Chapel Hill", status: "Applied", portal: "https://admissions.unc.edu/" },
    { id: "uncw", name: "UNCW", status: "Applied", portal: "https://uncw.edu/admissions/" },
  ],

  links: {
    canvas: "https://nhcs.instructure.com/",
    infiniteCampus: "https://www.infinitecampus.com/audience/parents-students/login-search",
    outlook: "https://outlook.office.com/mail/",
    commonApp: "https://apply.commonapp.org/",
    jobber: "https://secure.getjobber.com/",
    fafsa: "https://studentaid.gov/h/apply-for-aid/fafsa",
  },

  // Starting tasks. Every one can be edited or deleted in the app.
  seedTasks: [
    { title: "Log in to the NC State applicant portal and check for missing items", cat: "college", due: "2026-11-24", mins: 20, pri: 2 },
    { title: "Log in to the UNC applicant portal and check for missing items", cat: "college", due: "2026-11-24", mins: 20, pri: 2 },
    { title: "Log in to the UNCW applicant portal and check for missing items", cat: "college", due: "2026-11-24", mins: 20, pri: 2 },
    { title: "Finish the FAFSA (or confirm it's submitted)", cat: "college", due: "2026-12-01", mins: 60, pri: 2 },
    { title: "Make a scholarship list: local Wilmington, NC-specific, and school-specific awards", cat: "college", due: "2026-11-29", mins: 60, pri: 2 },
    { title: "Decide whether to apply to any more schools (most Regular Decision deadlines are around Jan 1–15)", cat: "college", due: "2026-12-10", mins: 30, pri: 1 },
    { title: "Ask counselor to send the Common App mid-year report after semester ends", cat: "college", due: "2027-01-22", mins: 10, pri: 1 },
    { title: "Sign up for a Beta event (need 2 this semester)", cat: "volunteer", due: "2026-11-22", mins: 15, pri: 3 },
    { title: "Plan NHS hours: count what's logged with the Check My Hours form", cat: "volunteer", due: "2026-11-23", mins: 15, pri: 2 },
    { title: "Decide on Beta Con (registration closes Dec 2)", cat: "volunteer", due: "2026-12-01", mins: 15, pri: 2 },
    { title: "Send this week's Lawn Lads invoices in Jobber", cat: "lawn", due: "2026-11-22", mins: 30, pri: 2 },
    { title: "Follow up on open Lawn Lads quotes", cat: "lawn", due: "2026-11-23", mins: 20, pri: 1 },
    { title: "Plan winter Lawn Lads services (leaf cleanup, pine straw, gutters)", cat: "lawn", due: "2026-11-30", mins: 45, pri: 1 },
    { title: "Check Canvas for anything due this week", cat: "school", due: "2026-11-20", mins: 15, pri: 3 },
    { title: "Check Infinite Campus grades before interim reports (Dec 3)", cat: "school", due: "2026-12-01", mins: 15, pri: 2 },
  ],
};
