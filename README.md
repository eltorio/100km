# 100km <https://eltorio.github.io/100km/>
Démonstration basique de l'affichage de la zone de 100km ⋃ Département à partir d'une adresse.
Démo à <https://eltorio.github.io/100km/>
L'adresse est géocodée puis un cercle est fusionné avec le département.

# Fonctionnement
Le fonctionement est simple soit l'adresse est geocodée depuis le paramètre a= de l'url exemple
[https://eltorio.github.io/100km/?a=18 route notre dame de la gorge, les contamines-montjoie](https://eltorio.github.io/100km/?a=18%20route%20notre%20dame%20de%20la20gorge,20les20contamines-montjoie)

soit si le paramètre a= n'est pas fourni une popup demande de saisir l'adresse.
Les adresses sont celles admises sur <https://api-adresse.data.gouv.fr> , en général ce qui fonctionne bien est une simple adresse:
numéro type_voie nom_voie, ville
la virgule séparant la ville et la partie rue.

Une case à cocher permet d'inclure l'intégralité du département comme dans l'arrêté de déconfinement. En décochant cette case seul le rayon est utilisé. Dans l'URL d=0 correspond à la case décochée, d=1 l'inverse.

Le rayon peut être modulé, par défaut il est à 100km comme dans le cas du déconfinement. Cela équivaut au paramètre r=100 dans l'URL.

En cliquant sur la carte le rayon est calculé dynamiquement.

Le paramètre z= peut prendre une valeur de 4 à 19 il s'agit du niveau de zoom initial.
L'URL dans la barre d'adresse est mise à jour dynamiquement avec les paramètres a= si celui-ci n'était pas fourni et z= lors du changement de zoom.

Le paramètre m= peut prendre la valeur 0 ou 1, 0 correspond au mode confinement (1km, pas tout le département), 1 à celui du mode déconfinement (100km+l'intégralité du département). Le mode par défaut est le confinement 💢😡😷.
 
Le bouton Q en haut à gauche permet d'afficher ou de cacher un QRCode permet d'avoir un accès direct à la page.

Les paramètres x= y= sont les coordonnées du centre de la carte. Elles sont mises à jour dans l'url à chaque déplacement. Attention si le centre de la carte fourni dans l'URL n'est pas dans la 'greenZone' celui-ci est ignoré et c'est le centre de l'extent greenZone qui est utilisé pour le centrage.

# Confinement <https://eltorio.github.io/100km/?d=0&r=1&z=16>
Une adaptation a été faite pour prendre en compte les règles du confinement.
Dans la popup il est nécessaire de décocher la case d'inclusion du département (seules les règles de distance et de frontières sont utilisées).
Il faut également réduire à 1 la taille du cercle (1km).
L'URL obtenue donne par exemple:
https://eltorio.github.io/100km/?a=18%20Route%20de%20Notre%20Dame%20de%20la%20Gorge,%2074170%20Les%20Contamines-Monjoie&d=0&r=1&x=989253.7471025363&y=6531596.167614371&z=16
Pour accéder à la popup pré-réglée il suffit de préciser les paramètres d=0&r=1 (eventuellement z=16 pour avoir un facteur de zoom pertinent).

# Couches
Les couches affichées sont : Géoportail cartes IGN, Géoportail satellites, Géoportail aviation OACI.
Pour intégrer dans votre propre site web demandez une clef api à <contact.geoservices@ign.fr>

# Adaptation
un fichier est manquant: keys.js il sert à définir 3 variables:
```javascript
var clefGeoportail = "votreclef"; 
var getUrlDepartement = function(insee_code) {
    var filterDepartement = `Filter=<Filter><PropertyIsEqualTo><PropertyName>INSEE_DEP</PropertyName><Literal>${insee_code}</Literal></PropertyIsEqualTo></Filter>`;
    var urlDepartement = `https://votre.serveur.wfs/wfsmap?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=ms:DEPARTEMENTS&SRSNAME=EPSG:2154&${filterDepartement}&outputFormat=geojson`;
    return urlDepartement;
}

var getUrlPays = function(iso_code) {
    var filterPays = `Filter=<Filter><PropertyIsEqualTo><PropertyName>CNTR_ID</PropertyName><Literal>${iso_code}</Literal></PropertyIsEqualTo></Filter>`;
    var urlPays = `https://votre.serveur.wfs/wfsmap?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=ms:PAYS&SRSNAME=EPSG:4326&${filterPays}&outputFormat=geojson`;
    return urlPays;
}
```
Si vous ne fournissez pas ces définitions elles sont substituées par des valeurs par défaut: la clef est celle du Géoportail, les fichiers de géométries ne sont alors plus obtenus depuis un serveur WFS mais lus depuis les fichiers statiques présents dans ./geobase/ , ex: geobase/INSEE_DEP_74.json . Les départements sont encodés avec des coordonnées projetées en [RGF93 (EPSG:2154)](https://epsg.io/2154).
```javascript
var clefGeoportail = (typeof clefGeoportail === 'undefined') ? realGeoportailAPIKey : clefGeoportail;
var getUrlDepartement = (typeof getUrlDepartement === 'undefined') ? function(insee_code){ 
                                            return `geobase/INSEE_DEP_${insee_code}.json`;  }
                                                                : getUrlDepartement ;
var getUrlPays = (typeof getUrlPays === 'undefined') ? function(iso_code){ 
                                            return `geobase/PAYS_${iso_code}.json`;  }
                                                                : getUrlPays ;
```
