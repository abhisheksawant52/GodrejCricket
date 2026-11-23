BEGIN;

DO $$
DECLARE
  matched_count integer;
BEGIN
  WITH targets(name, current_team, player_category) AS (
    VALUES
      ('Ayushman Thakur', 'Titan Thunder', 'Men'),
      ('Vanaparthi Akshit', 'Titan Thunder', 'Men'),
      ('Lee Fernandes', 'Titan Thunder', 'Men'),
      ('Siddharth Singh', 'Titan Thunder', 'Men'),
      ('Pranav', 'Titan Thunder', 'Men'),
      ('Jian Badiyani', 'Titan Thunder', 'Men'),
      ('Kevin B.', 'Titan Thunder', 'Men'),
      ('Vikas Devnani', 'Titan Thunder', 'Men'),
      ('Niya kande', 'Black Thunder', 'Kids'),
      ('Nishadh Modak', 'Black Thunder', 'Kids'),
      ('Kunal', 'Black Thunder', 'Kids'),
      ('Shivaan Vasi', 'Black Thunder', 'Kids'),
      ('Jiyansh Anand Sonwadekar', 'Black Thunder', 'Kids'),
      ('Dhruvin Patel', 'Black Thunder', 'Kids'),
      ('Jay Biyani', 'Black Thunder', 'Kids'),
      ('Shreshth Tripathi', 'Black Thunder', 'Kids')
  )
  SELECT count(*) INTO matched_count
  FROM registrations AS r
  JOIN targets AS t ON r.name = t.name
    AND r.details->>'team_name' = t.current_team
    AND r.details->>'player_category' = t.player_category
  WHERE r.type = 'Player';

  IF matched_count <> 16 THEN
    RAISE EXCEPTION 'Expected to find exactly 16 matching player registrations; found %. No updates applied.', matched_count;
  END IF;

  WITH targets(name, current_team, player_category) AS (
    VALUES
      ('Ayushman Thakur', 'Titan Thunder', 'Men'),
      ('Vanaparthi Akshit', 'Titan Thunder', 'Men'),
      ('Lee Fernandes', 'Titan Thunder', 'Men'),
      ('Siddharth Singh', 'Titan Thunder', 'Men'),
      ('Pranav', 'Titan Thunder', 'Men'),
      ('Jian Badiyani', 'Titan Thunder', 'Men'),
      ('Kevin B.', 'Titan Thunder', 'Men'),
      ('Vikas Devnani', 'Titan Thunder', 'Men'),
      ('Niya kande', 'Black Thunder', 'Kids'),
      ('Nishadh Modak', 'Black Thunder', 'Kids'),
      ('Kunal', 'Black Thunder', 'Kids'),
      ('Shivaan Vasi', 'Black Thunder', 'Kids'),
      ('Jiyansh Anand Sonwadekar', 'Black Thunder', 'Kids'),
      ('Dhruvin Patel', 'Black Thunder', 'Kids'),
      ('Jay Biyani', 'Black Thunder', 'Kids'),
      ('Shreshth Tripathi', 'Black Thunder', 'Kids')
  )
  UPDATE registrations AS r
  SET details = jsonb_set(
    COALESCE(r.details, '{}'::jsonb),
    '{team_name}',
    to_jsonb(CASE t.current_team
      WHEN 'Titan Thunder' THEN 'Black Thunder'
      ELSE 'Titan Thunder'
    END),
    true
  )
  FROM targets AS t
  WHERE r.type = 'Player'
    AND r.name = t.name
    AND r.details->>'team_name' = t.current_team
    AND r.details->>'player_category' = t.player_category;
END $$;

COMMIT;
