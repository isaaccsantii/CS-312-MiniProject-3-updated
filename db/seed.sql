-- CS 312 Mini-Project 3 - starter data
-- 3 users and 5 blog posts so the feed isn't empty on first launch.
--
-- Passwords are stored as bcrypt hashes. The plain-text versions you can sign in with:
--   isaac_s   / Lumberjack26!
--   maria_g   / PineTrail#7
--   jordan_k  / DesertSun9!

INSERT INTO users (user_id, password, name) VALUES
  ('isaac_s',  '$2b$10$EzTv9msPSbZVoQmcNm4StOP7zyqb6simyIh1Yme3eZZjZuU5ZDzdy', 'Isaac Santiago'),
  ('maria_g',  '$2b$10$PrVVhb79tguNSIka4xoiSeGvdAku.bMljJDk3xpCfYHo5mJqAgla.', 'Maria Gonzales'),
  ('jordan_k', '$2b$10$VlZ5GpddomQynLBUILDXku/dcxwytupNiRma1bgn7zXprm8MlBOQi', 'Jordan Kim');

INSERT INTO blogs (creator_name, creator_user_id, title, body, category, date_created) VALUES
  ('Isaac Santiago', 'isaac_s', 'Setting Up a Home Lab on a Student Budget',
   'You don''t need a rack of servers to practice cybersecurity. An old laptop, VirtualBox, and a couple of free VMs (Kali, Ubuntu Server, and a vulnerable target like Metasploitable) are enough to learn scanning, logging, and incident response. Start small, snapshot everything, and keep the lab on a host-only network.',
   'Tech', '2026-09-03 18:42:00'),

  ('Maria Gonzales', 'maria_g', 'Five Hikes Within 30 Minutes of Flagstaff',
   'Fatman''s Loop, Buffalo Park, Sunset Crater''s Lava Flow Trail, the Arizona Trail at Walnut Canyon, and Kachina Trail all make great after-class hikes. Bring more water than you think. The altitude sneaks up on you.',
   'Lifestyle', '2026-09-10 09:15:00'),

  ('Jordan Kim', 'jordan_k', 'How I Finally Stopped Cramming for Exams',
   'Spaced repetition changed everything for me. I make flashcards right after each lecture and review them for 15 minutes a day. By exam week there is nothing left to cram, just a quick review.',
   'Education', '2026-09-18 21:05:00'),

  ('Isaac Santiago', 'isaac_s', 'What Track Taught Me About Debugging',
   'In the 400m, panicking on the back stretch is how you lose. Debugging is the same: slow down, isolate one variable, and change one thing at a time. Reading the error message is basically checking your splits.',
   'Lifestyle', '2026-10-01 07:30:00'),

  ('Maria Gonzales', 'maria_g', 'SQL Joins Explained with Pizza',
   'An INNER JOIN is the toppings both of you agreed on. A LEFT JOIN is everything you wanted, plus whatever your friend also picked. A FULL OUTER JOIN is ordering two pizzas and hoping for the best.',
   'Tech', '2026-10-14 12:00:00');
