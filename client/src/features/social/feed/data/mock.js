/*
 * Sample content so the home page has something to show.
 * Replace with API data (see services/api/endpoints.js) when the backend is ready.
 */

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

export const stories = [
  { id: "s1", name: "Alex Morgan", seen: false },
  { id: "s2", name: "Sarah Williams", seen: false },
  { id: "s3", name: "Daniel Cruz", seen: false },
  { id: "s4", name: "Emma Wilson", seen: true },
  { id: "s5", name: "Noah Bennett", seen: true },
  { id: "s6", name: "Mia Torres", seen: true },
];

export const initialPosts = [
  {
    id: "p1",
    author: { name: "Alex Morgan", username: "alexmorgan" },
    content:
      "Excited to see what everyone is building today! New ideas, new connections, and new opportunities. 🚀",
    images: [],
    createdAt: ago(120),
    likes: 128,
    liked: false,
    saved: false,
    commentCount: 24,
    comments: [
      {
        id: "c1",
        author: { name: "Sarah Williams", username: "sarahw" },
        text: "Shipping something small today. Let's go.",
        createdAt: ago(95),
      },
    ],
    fromFollowing: true,
  },
  {
    id: "p2",
    author: { name: "Sarah Williams", username: "sarahw" },
    content:
      "We shipped our first public beta this morning. Thank you to everyone who tested early builds and sent notes. The sharpest feedback came from people who had never seen the product before.",
    images: [],
    createdAt: ago(60 * 5),
    likes: 342,
    liked: true,
    saved: false,
    commentCount: 41,
    comments: [],
    fromFollowing: true,
  },
  {
    id: "p3",
    author: { name: "Daniel Cruz", username: "danielcruz" },
    content:
      "Ranked match night on Friday. Looking for two more players for a diamond squad, any role. Drop your handle below and I'll send invites.",
    images: [],
    createdAt: ago(60 * 26),
    likes: 56,
    liked: false,
    saved: true,
    commentCount: 31,
    comments: [],
    fromFollowing: false,
  },
  {
    id: "p4",
    author: { name: "Emma Wilson", username: "emmawilson" },
    content:
      "Reminder: the community meetup has moved to the larger room. Doors open at 6, talks start at 6:30. Bring a friend.",
    images: [],
    createdAt: ago(60 * 50),
    likes: 89,
    liked: false,
    saved: false,
    commentCount: 7,
    comments: [],
    fromFollowing: false,
  },
];

export const trendingTopics = [
  { tag: "Technology", posts: 12400 },
  { tag: "Gaming", posts: 9800 },
  { tag: "Entertainment", posts: 7200 },
  { tag: "Community", posts: 4300 },
];

export const suggestedPeople = [
  { id: "u1", name: "Alex Morgan", mutual: 2 },
  { id: "u2", name: "Sarah Williams", mutual: 3 },
  { id: "u3", name: "Daniel Cruz", mutual: 4 },
];
