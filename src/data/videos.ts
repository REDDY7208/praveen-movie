export interface Video {
  id: string
  title: string
  channel: string
  views: string
  duration: string
  thumbnail: string
  videoUrl: string
  description: string
}

export const videos: Video[] = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    channel: 'Blender Foundation',
    views: '12M views',
    duration: '9:56',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: 'Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself.',
  },
  {
    id: '2',
    title: 'Elephant Dream',
    channel: 'Blender Foundation',
    views: '8M views',
    duration: '10:54',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_s5_both.jpg/800px-Elephants_Dream_s5_both.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    description: 'The first Blender Open Movie from 2006.',
  },
  {
    id: '3',
    title: 'For Bigger Blazes',
    channel: 'Google',
    views: '3M views',
    duration: '0:15',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'HBO GO now works with Chromecast -- the easiest way to enjoy online video on your TV.',
  },
  {
    id: '4',
    title: 'For Bigger Escapes',
    channel: 'Google',
    views: '5M views',
    duration: '0:15',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'Introducing Chromecast. The easiest way to enjoy online video and music on your TV.',
  },
  {
    id: '5',
    title: 'Subaru Outback',
    channel: 'Subaru',
    views: '2M views',
    duration: '0:15',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    description: 'Subaru Outback on street and dirt.',
  },
  {
    id: '6',
    title: 'Volkswagen GTI Review',
    channel: 'Auto Channel',
    views: '1.4M views',
    duration: '0:15',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/VolkswagenGTIReview.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    description: 'Volkswagen GTI Review.',
  },
]
