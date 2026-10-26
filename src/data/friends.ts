export interface FriendLink {
  name: string;
  url: string;
  avatar: string;
  description?: string;
}

// 按展示顺序维护；头像直接引用外部 URL，不在构建时下载。
export const friends: FriendLink[] = [
  {
    name: 'LAGSNES',
    url: 'https://onyxaxis.org/',
    avatar: 'https://onyxaxis.org/avatar.jpg',
  },
  {
    name: '是阿改哦',
    url: 'https://www.haoyu233.com/',
    avatar: 'https://weavatar.com/avatar/14e584196d31262ea144ab4d75d4c083?s=500',
    description: '孩儿立志出乡关，学不成名誓不还。',
  },
  {
    name: 'makotowu',
    url: 'https://blog.makotowu.cn/',
    avatar: 'https://q1.qlogo.cn/g?b=qq&nk=2046840544&s=640',
    description: '飞萤扑火，向「阳」而生。',
  },
  {
    name: 'Riseforever',
    url: 'https://www.luming.cool/',
    avatar: 'https://weavatar.com/avatar/302380667bdaf4e1390800e62494d4af?s=512&r=G',
    description: '不慌张，不绝望，不狂妄，不投降。',
  },
];
