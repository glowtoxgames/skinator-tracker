const CHARACTER_IMPORT_SEED = [
  'SkeletonWarrior0001','AstronautSkeleton0001','SnakeDude0001','TentacleGuy0001','BasicGhost0001','sharkguy0001','GREIC','ChainsawGuy','skullmonster0001','BrainMonster0001','EyeballGuy0001','MantisGuy0001','MilitarySkeleton0001','Mushroomguy0001','werewolf','WormMonster0001','Crabguy0001_SpriteSheet_01'
].map((fileName,index)=>({
  id:`imported-character-${index+1}`,
  fileName,
  gameName:'',
  zone:'',
  isBoss:false,
  prefabCreated:false,
  mainGif:`assets/character-gifs/${fileName}_360Gifanimation.gif`,
  petImage:'',
  spawnModifierIds:[],
  variants:[],
  superModifierIds:[],
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString()
}));
