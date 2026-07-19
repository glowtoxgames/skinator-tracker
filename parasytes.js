const PARASYTE_SEED=[
['Speed Parasite',[['Lesser','Increases part speed by 1'],['Mature','Increases part speed by 2'],['Evolved','Increases part speed by 3'],['Apex','Increases part speed by 4']]],
['Part health Parasite',[['Lesser','Adds 1 max health to the part up to 6'],['Mature','Adds 2 max health to the part up to 6'],['Evolved','Adds 3 max health to the part up to 6'],['Apex','Adds 4 max health to the part up to 6']]],
['Damage Parasite',[['Lesser','Increases part damage by 1'],['Mature','Increases part damage by 2'],['Evolved','Increases part damage by 3'],['Apex','Increases part damage by 4']]],
['Range Parasite',[['Mature','Add 1 range to the part up to 3'],['Evolved','Add 2 range to the part up to 3'],['Apex','Add 3 range to the part up to 3']]],
['Character health Parasite',[['Lesser','Increases Character max health by 1'],['Mature','Increases Character max health by 2'],['Evolved','Increases Character max health by 3'],['Apex','Increases Character max health by 4']]],
['Random Attack Modifier Parasite',[['Mature','Adds 1 random modifier to the part up to 3'],['Evolved','Adds 2 random modifier to the part up to 3'],['Apex','Adds 3 random modifier to the part up to 3']]],
['Random Support Modifier Parasite',[['Mature','Adds 1 random modifier to the part up to 3'],['Evolved','Adds 2 random modifier to the part up to 3'],['Apex','Adds 3 random modifier to the part up to 3']]],
['Reroll Heart Modifier Parasite',[['Mature','Rerolls 1 modifier randomly'],['Evolved','Rerolls 2 modifier randomly'],['Apex','Rerolls 3 modifier randomly']]],
['Reroll Attack Modifier Parasite',[['Mature','Rerolls 1 modifier randomly'],['Evolved','Rerolls 2 modifier randomly'],['Apex','Rerolls 3 modifier randomly']]],
['Reroll Support Modifier Parasite',[['Mature','Rerolls 1 modifier randomly'],['Evolved','Rerolls 2 modifier randomly'],['Apex','Rerolls 3 modifier randomly']]],
['Lucky Parasite',[['Lesser','1% chance to find better turmos'],['Mature','3% chance to find better turmos'],['Evolved','5% chance to find better turmos'],['Apex','8% chance to find better turmos']]],
['Greedy Parasite',[['Lesser','Get 10% more gold in crucibles'],['Mature','Get 15% more gold in crucibles'],['Evolved','Get 20% more gold in crucibles'],['Apex','Get 25% more gold in crucibles']]]
].flatMap(([family,levels])=>levels.map(([level,description])=>({id:`${family}-${level}`.toLowerCase().replace(/[^a-z0-9]+/g,'-'),family,level,description,gif:''})));
