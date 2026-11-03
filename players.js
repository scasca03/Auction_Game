/* Football player pool. Ratings are an illustrative snapshot, not official game data. */
const PLAYER_ROWS = `
Kylian Mbappé|DC|Real Madrid|91|157|FR
Erling Haaland|DC|Manchester City|91|167|NO
Pedri|MC|FC Barcelona|90|165|ES
Thibaut Courtois|POR|Real Madrid|90|39|BE
Vitinha|MC|Paris Saint-Germain|90|149|PT|Vitinha (footballer, born 2000)
Ousmane Dembélé|DC|Paris Saint-Germain|90|122.5|FR
Harry Kane|DC|Bayern Múnich|90|97|GB
Jude Bellingham|MCO|Real Madrid|89|150.5|GB
Achraf Hakimi|LD|Paris Saint-Germain|89|111|MA
Joshua Kimmich|MCD|Bayern Múnich|89|86|DE
Rodri|MCD|Manchester City|89|88|ES|Rodri (footballer, born 1996)
Raphinha|EI|FC Barcelona|89|104|BR
Gianluigi Donnarumma|POR|Manchester City|89|97|IT
Mohamed Salah|ED|Liverpool|89|64|EG
Vinícius Júnior|EI|Real Madrid|89|136.5|BR
Lamine Yamal|ED|FC Barcelona|89|151.5|ES
Gabriel Magalhães|DFC|Arsenal|89|104|BR
Federico Valverde|MC|Real Madrid|88|104.5|UY
Nuno Mendes|LI|Paris Saint-Germain|88|115.5|PT
Nicolò Barella|MC|Inter de Milán|88|91.5|IT
Alisson Becker|POR|Liverpool|88|45|BR|Alisson Becker
Declan Rice|MCD|Arsenal|88|96|GB
Jan Oblak|POR|Atlético de Madrid|88|45|SI
Bruno Fernandes|MCO|Manchester United|88|88|PT
Moisés Caicedo|MCD|Chelsea|88|107|EC
Lautaro Martínez|DC|Inter de Milán|88|99|AR
Jamal Musiala|MCO|Bayern Múnich|88|133.5|DE
Michael Olise|ED|Bayern Múnich|88|118.5|FR
Virgil van Dijk|DFC|Liverpool|88|29.5|NL
William Saliba|DFC|Arsenal|88|105.5|FR
David Raya|POR|Arsenal|87|54.5|ES
Mike Maignan|POR|AC Milan|87|60|FR
João Neves|MC|Paris Saint-Germain|87|117.5|PT|João Neves (footballer, born 2004)
Frenkie de Jong|MC|FC Barcelona|87|79.5|NL
Bukayo Saka|ED|Arsenal|87|103.5|GB
Khvicha Kvaratskhelia|EI|Paris Saint-Germain|87|109|GE
Kevin De Bruyne|MC|Nápoles|87|36.5|BE
Victor Osimhen|DC|Galatasaray|87|95|NG
Florian Wirtz|MCO|Liverpool|87|116.5|DE
Marquinhos|DFC|Paris Saint-Germain|87|54.5|BR|Marquinhos (footballer, born 1994)
Luis Díaz|EI|Bayern Múnich|87|80|CO
Alessandro Bastoni|DFC|Inter de Milán|87|87|IT
Alexander Isak|DC|Liverpool|87|96.5|SE
Willian Pacho|DFC|Paris Saint-Germain|87|97|EC
Rúben Dias|DFC|Manchester City|87|68.5|PT
Jonathan Tah|DFC|Bayern Múnich|87|66.5|DE
Federico Dimarco|LI|Inter de Milán|86|65.5|IT
Dominik Szoboszlai|MCO|Liverpool|86|88|HU
Scott McTominay|MC|Nápoles|86|68|GB
Ryan Gravenberch|MCD|Liverpool|86|84|NL
Julián Álvarez|DC|Atlético de Madrid|86|91|AR
Yann Sommer|POR|Inter de Milán|86|1.7|CH
Hakan Çalhanoğlu|MCD|Inter de Milán|86|47.5|TR
Bruno Guimarães|MC|Newcastle United|86|72|BR
Alexis Mac Allister|MC|Liverpool|86|79.5|AR
Joan García|POR|FC Barcelona|86|72.5|ES|Joan García (footballer)
Jules Koundé|LD|FC Barcelona|86|73|FR
Viktor Gyökeres|DC|Arsenal|86|79.5|SE
Nico Schlotterbeck|DFC|Borussia Dortmund|86|75.5|DE
Martin Ødegaard|MC|Arsenal|86|79.5|NO
Gregor Kobel|POR|Borussia Dortmund|86|66.5|CH
Robert Lewandowski|DC|FC Barcelona|86|23|PL
Cole Palmer|MCO|Chelsea|86|93|GB
Lionel Messi|MCO|Inter Miami|86|22|AR
Dayot Upamecano|DFC|Bayern Múnich|86|74|FR
Bremer|DFC|Juventus|86|58.5|BR|Bremer (footballer)
Sandro Tonali|MCD|Newcastle United|85|60.5|IT
Tijjani Reijnders|MC|Manchester City|85|61.5|NL
Emiliano Martínez|POR|Aston Villa|85|26.5|AR
Joško Gvardiol|DFC|Manchester City|85|66|HR
Sergej Milinković-Savić|MC|Al Hilal|85|51.5|RS
Trent Alexander-Arnold|LD|Real Madrid|85|58|GB
Bryan Mbeumo|ED|Manchester United|85|64.5|CM
Marc Cucurella|LI|Chelsea|85|56.5|ES
Álex Grimaldo|LI|Bayer Leverkusen|85|53|ES|Alejandro Grimaldo
Enzo Fernández|MC|Chelsea|85|73|AR
Désiré Doué|ED|Paris Saint-Germain|85|83.5|FR
Marcus Thuram|DC|Inter de Milán|85|58.5|FR
Martín Zubimendi|MCD|Arsenal|85|60|ES
Péter Gulácsi|POR|RB Leipzig|85|6|HU
Rúben Neves|MCD|Al Hilal|85|47.5|PT
Christian Pulisic|ED|AC Milan|85|59|US
Phil Foden|MCO|Manchester City|85|71.5|GB
Fabián Ruiz|MC|Paris Saint-Germain|85|52.5|ES
Marco Carnesecchi|POR|Atalanta|85|55|IT
Youri Tielemans|MC|Aston Villa|85|54|BE
Serhou Guirassy|DC|Borussia Dortmund|85|54|GN
Granit Xhaka|MCD|Sunderland|85|36|CH
Paulo Dybala|MCO|Roma|85|44.5|AR
Nico Williams|EI|Athletic Club|85|73.5|ES
Karim Benzema|DC|Al Hilal|85|18.5|FR
Cristiano Ronaldo|DC|Al Nassr|85|18.5|PT
Hugo Ekitiké|DC|Liverpool|85|74.5|FR
Patrik Schick|DC|Bayer Leverkusen|85|54|CZ
Ibrahima Konaté|DFC|Liverpool|85|59|FR
Theo Hernández|LI|Al Hilal|84|40.5|FR
Marcos Llorente|LD|Atlético de Madrid|84|36.5|ES
Felix Nmecha|MC|Borussia Dortmund|84|54.5|DE
Adrien Rabiot|MC|AC Milan|84|40.5|FR
João Cancelo|LD|FC Barcelona|84|30.5|PT
`;
const FOOTBALL_PLAYERS=PLAYER_ROWS.trim().split('\n').map((row,id)=>{
  const [name,pos,club,ovr,value,country,wiki]=row.split('|');
  return {id,name,pos,club,ovr:Number(ovr),value:Number(value),country,wiki:wiki||name,rarity:Number(ovr)>=90?'titan':Number(ovr)>=88?'elite':Number(ovr)>=86?'rare':'gold'};
});
