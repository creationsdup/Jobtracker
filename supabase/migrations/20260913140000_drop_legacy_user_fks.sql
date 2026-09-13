-- Les tables métier référencent encore l'ancienne table Prisma "User", qui ne contient qu'une
-- seule ligne (le compte de l'auteur). Tout autre compte — tableaux par code de l'édition lite
-- comme nouveaux comptes classiques — ne peut donc pas enregistrer de candidature, de logo ou
-- d'expérience (erreur « violates foreign key constraint "Application_userId_fkey" »).
--
-- WHY supprimer plutôt que remplir "User" : la propriété des lignes est déjà garantie par les
-- policies RLS ("userId" = auth.uid()::text) ; "User" est une table morte (voir CLAUDE.md).
-- Aucune donnée n'est supprimée : seules les contraintes disparaissent.
-- À plus long terme : passer "userId" en uuid avec une clé étrangère vers auth.users.

alter table public."Application" drop constraint if exists "Application_userId_fkey";
alter table public."OrgLogo"     drop constraint if exists "OrgLogo_userId_fkey";
alter table public."Experience"  drop constraint if exists "Experience_userId_fkey";
alter table public."Resume"      drop constraint if exists "Resume_userId_fkey";
alter table public."UserGoal"    drop constraint if exists "UserGoal_userId_fkey";
