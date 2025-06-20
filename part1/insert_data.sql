INSERT INTO Users (username, email, password_hash, role) VALUES
('slice123', 'slice@example.com', 'hashed123', 'owner'),
('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
('carol123', 'carol@example.com', 'hashed789', 'owner'),
('daviddai', 'daviddai@example.com', 'hashed111', 'owner'),
('ws', 'ws@example.com', 'hashed222', 'walker');

INSERT INTO Dogs (owner_id, name, size) VALUES
((SELECT user_id FROM Users WHERE username = 'slice123'), 'Max', 'medium'),
((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
((SELECT user_id FROM Users WHERE username = 'slice123'), 'Buddy', 'large'),
((SELECT user_id FROM Users WHERE username = 'daviddai'), 'Lucy', 'small'),
((SELECT user_id FROM Users WHERE username = 'carol123'), 'Charlie', 'medium');

INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
((SELECT dog_id FROM Dogs WHERE name = 'Buddy'), '2025-06-11 10:00:00', 60, 'Hub Central', 'open'),
((SELECT dog_id FROM Dogs WHERE name = 'Lucy'), '2025-06-12 14:30:00', 30, 'Rundle Mall', 'completed'),
((SELECT dog_id FROM Dogs WHERE name = 'Charlie'), '2025-06-13 16:00:00', 45, 'Glenelg', 'open');