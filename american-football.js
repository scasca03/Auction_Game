/* American football player pool. Ratings and market values are illustrative, not official data. */
const AMERICAN_FOOTBALL_ROWS = `
Patrick Mahomes|QB|Kansas City Chiefs|99|60|US
Lamar Jackson|QB|Baltimore Ravens|98|58|US
Josh Allen|QB|Buffalo Bills|98|57|US
Joe Burrow|QB|Cincinnati Bengals|97|56|US
Jalen Hurts|QB|Philadelphia Eagles|96|54|US
Jayden Daniels|QB|Washington Commanders|94|50|US
Justin Herbert|QB|Los Angeles Chargers|94|49|US
C.J. Stroud|QB|Houston Texans|93|48|US
Dak Prescott|QB|Dallas Cowboys|92|45|US
Jared Goff|QB|Detroit Lions|91|43|US
Brock Purdy|QB|San Francisco 49ers|90|41|US
Jordan Love|QB|Green Bay Packers|90|40|US
Trevor Lawrence|QB|Jacksonville Jaguars|89|38|US
Bo Nix|QB|Denver Broncos|88|36|US
Drake Maye|QB|New England Patriots|87|35|US
Christian McCaffrey|RB|San Francisco 49ers|97|52|US
Saquon Barkley|RB|Philadelphia Eagles|96|50|US
Derrick Henry|RB|Baltimore Ravens|95|47|US
Bijan Robinson|RB|Atlanta Falcons|94|48|US
Jahmyr Gibbs|RB|Detroit Lions|93|46|US
Jonathan Taylor|RB|Indianapolis Colts|92|43|US
De'Von Achane|RB|Miami Dolphins|91|42|US
Josh Jacobs|RB|Green Bay Packers|90|39|US
Breece Hall|RB|New York Jets|89|38|US
James Cook|RB|Buffalo Bills|88|36|US
Kyren Williams|RB|Los Angeles Rams|87|34|US
Kenneth Walker III|RB|Seattle Seahawks|86|32|US
Alvin Kamara|RB|New Orleans Saints|85|29|US
Justin Jefferson|WR|Minnesota Vikings|99|59|US
Ja'Marr Chase|WR|Cincinnati Bengals|99|58|US
CeeDee Lamb|WR|Dallas Cowboys|97|55|US
Tyreek Hill|WR|Miami Dolphins|96|53|US
Amon-Ra St. Brown|WR|Detroit Lions|96|52|US
A.J. Brown|WR|Philadelphia Eagles|95|51|US
Puka Nacua|WR|Los Angeles Rams|94|50|US
Nico Collins|WR|Houston Texans|93|48|US
Garrett Wilson|WR|New York Jets|92|47|US
Mike Evans|WR|Tampa Bay Buccaneers|92|44|US
Marvin Harrison Jr.|WR|Arizona Cardinals|91|46|US
Drake London|WR|Atlanta Falcons|91|45|US
DeVonta Smith|WR|Philadelphia Eagles|90|43|US
DK Metcalf|WR|Pittsburgh Steelers|89|41|US
Terry McLaurin|WR|Washington Commanders|89|39|US
Jaylen Waddle|WR|Miami Dolphins|88|40|US
Chris Olave|WR|New Orleans Saints|87|38|US
Travis Kelce|TE|Kansas City Chiefs|96|45|US
George Kittle|TE|San Francisco 49ers|95|44|US
Sam LaPorta|TE|Detroit Lions|93|43|US
Mark Andrews|TE|Baltimore Ravens|92|40|US
Trey McBride|TE|Arizona Cardinals|91|42|US
T.J. Hockenson|TE|Minnesota Vikings|90|39|US
David Njoku|TE|Cleveland Browns|88|35|US
Brock Bowers|TE|Las Vegas Raiders|88|40|US
Dalton Kincaid|TE|Buffalo Bills|87|36|US
Trent Williams|OL|San Francisco 49ers|97|36|US
Penei Sewell|OL|Detroit Lions|95|39|US
Lane Johnson|OL|Philadelphia Eagles|94|32|US
Creed Humphrey|OL|Kansas City Chiefs|93|35|US
Tyron Smith|OL|New York Jets|92|27|US
Zack Martin|OL|Dallas Cowboys|92|29|US
Quenton Nelson|OL|Indianapolis Colts|91|31|US
Rashawn Slater|OL|Los Angeles Chargers|90|33|US
Chris Lindstrom|OL|Atlanta Falcons|90|32|US
Tristan Wirfs|OL|Tampa Bay Buccaneers|89|35|US
Joe Thuney|OL|Chicago Bears|88|26|US
Jordan Mailata|OL|Philadelphia Eagles|87|27|AU
Myles Garrett|DL|Cleveland Browns|99|54|US
Micah Parsons|DL|Dallas Cowboys|98|53|US
T.J. Watt|DL|Pittsburgh Steelers|97|50|US
Nick Bosa|DL|San Francisco 49ers|96|49|US
Chris Jones|DL|Kansas City Chiefs|95|47|US
Maxx Crosby|DL|Las Vegas Raiders|95|48|US
Aidan Hutchinson|DL|Detroit Lions|94|47|US
Dexter Lawrence|DL|New York Giants|93|43|US
Jonathan Allen|DL|Washington Commanders|91|39|US
Quinnen Williams|DL|New York Jets|91|42|US
Danielle Hunter|DL|Houston Texans|90|39|US
Will Anderson Jr.|DL|Houston Texans|89|42|US
Fred Warner|LB|San Francisco 49ers|97|46|US
Roquan Smith|LB|Baltimore Ravens|95|43|US
Matt Milano|LB|Buffalo Bills|91|37|US
Bobby Wagner|LB|Washington Commanders|90|32|US
Demario Davis|LB|New Orleans Saints|90|31|US
Jeremiah Owusu-Koramoah|LB|Cleveland Browns|89|35|US
Patrick Queen|LB|Pittsburgh Steelers|88|34|US
Zack Baun|LB|Philadelphia Eagles|87|32|US
Lavonte David|LB|Tampa Bay Buccaneers|86|29|US
Devin White|LB|Houston Texans|85|28|US
Sauce Gardner|CB|New York Jets|96|48|US
Patrick Surtain II|CB|Denver Broncos|96|47|US
Jalen Ramsey|CB|Miami Dolphins|94|41|US
Derek Stingley Jr.|CB|Houston Texans|93|44|US
Trent McDuffie|CB|Kansas City Chiefs|92|42|US
Denzel Ward|CB|Cleveland Browns|91|39|US
Jaylon Johnson|CB|Chicago Bears|90|38|US
Devon Witherspoon|CB|Seattle Seahawks|89|40|US
Kyle Hamilton|S|Baltimore Ravens|96|45|US
Antoine Winfield Jr.|S|Tampa Bay Buccaneers|94|42|US
Jessie Bates III|S|Atlanta Falcons|92|39|US
Justin Tucker|K|Baltimore Ravens|91|22|US
`;
const AMERICAN_FOOTBALL_PLAYERS=AMERICAN_FOOTBALL_ROWS.trim().split('\n').map((row,id)=>{
  const [name,pos,club,ovr,value,country,wiki]=row.split('|');
  return {id,name,pos,club,ovr:Number(ovr),value:Number(value),country,wiki:wiki||name,rarity:Number(ovr)>=96?'titan':Number(ovr)>=92?'elite':Number(ovr)>=88?'rare':'gold'};
});
