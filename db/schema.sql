-- CS 312 Mini-Project 3 - BlogDB schema
-- Run this inside the BlogDB database (pgAdmin > BlogDB > Query Tool), then run seed.sql.

DROP TABLE IF EXISTS blogs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id    VARCHAR(255) PRIMARY KEY,
  password   VARCHAR(255) NOT NULL,          -- bcrypt hash, never the raw password (bonus)
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE blogs (
  blog_id         SERIAL       PRIMARY KEY,
  creator_name    VARCHAR(255) NOT NULL,
  creator_user_id VARCHAR(255) NOT NULL
                  REFERENCES users(user_id)
                  ON UPDATE CASCADE           -- if a user changes their user_id, their posts follow
                  ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  body            TEXT         NOT NULL,
  category        VARCHAR(50)  NOT NULL DEFAULT 'Other',
  date_created    TIMESTAMP    NOT NULL DEFAULT NOW(),
  date_updated    TIMESTAMP
);

CREATE INDEX idx_blogs_creator ON blogs(creator_user_id);
