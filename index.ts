import { Brand } from 'ts-brand';
import { z } from 'zod';

//------------------------------------------------
// Permission Levels
enum PermissionLevelEnum {
  OWNER_ONLY = 'OWNER_ONLY',
  COMPANY_ONLY = 'COMPANY_ONLY',
  PUBLIC = 'PUBLIC',
}
const PermissionLevel = z.nativeEnum(PermissionLevelEnum);
type PermissionLevel = z.infer<typeof PermissionLevel>;

//------------------------------------------------
// UUID
type UUID = Brand<'UUID', string>;
const UUID = z.string().refine(isUUID);
function isUUID(id: string): id is UUID {
  const UUIDRegExp =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
  return UUIDRegExp.test(id);
}

//------------------------------------------------
// Company
type CompanyId = Brand<'CompanyId', UUID>;
const CompanyId = z.string().refine(isCompanyId);
function isCompanyId(maybeCompanyId: string): maybeCompanyId is CompanyId {
  return isUUID(maybeCompanyId) && companiesById.hasOwnProperty(maybeCompanyId);
}

const Company = z.object({ id: CompanyId, name: z.string() });
type Company = z.infer<typeof Company>;
const companiesById: Record<CompanyId, Company> = {
  'a0a0939e-feb1-4923-943e-72562240197c': {
    id: 'a0a0939e-feb1-4923-943e-72562240197c',
    name: 'company 1',
  },
  '69783ec6-c31e-4848-a2f2-14756b9a9001': {
    id: '69783ec6-c31e-4848-a2f2-14756b9a9001',
    name: 'company 2',
  },
};

//------------------------------------------------
// UserId
type UserId = Brand<'UserId', UUID>;
const UserId = z.string().refine(isUserId);
function isUserId(maybeUserId: string): maybeUserId is UserId {
  return isUUID(maybeUserId) && usersById.hasOwnProperty(maybeUserId);
}
// User
const User = z.object({
  id: UserId,
  name: z.string(),
  companyId: CompanyId,
});
type User = z.infer<typeof User>;
const usersById: Record<UserId, User> = {
  //   ^?
  '5c17178a-d0eb-4dd9-ad99-7bdc9be6d60d': {
    id: '5c17178a-d0eb-4dd9-ad99-7bdc9be6d60d',
    name: 'owns no files',
    companyId: 'a0a0939e-feb1-4923-943e-72562240197c',
  },
  '2fd50c57-b023-4df9-aa8a-d1f2b0191461': {
    id: '2fd50c57-b023-4df9-aa8a-d1f2b0191461',
    name: 'current user',
    companyId: '69783ec6-c31e-4848-a2f2-14756b9a9001',
  },
  'c8936de5-22a4-4b25-9510-26114074dbc4': {
    id: 'c8936de5-22a4-4b25-9510-26114074dbc4',
    name: 'owns some private files',
    companyId: '69783ec6-c31e-4848-a2f2-14756b9a9001',
  },
  'd9ee1fa1-9383-46bf-8931-ccd7da7b8b5e': {
    id: 'd9ee1fa1-9383-46bf-8931-ccd7da7b8b5e',
    name: 'owns some public files',
    companyId: 'a0a0939e-feb1-4923-943e-72562240197c',
  },
};

// CurrentUser
type CurrentUser = Brand<User, 'CurrentUser'>;
const CurrentUser = User.refine(isCurrentUser);
function isCurrentUser(
  maybeCurrentUser: User
): maybeCurrentUser is CurrentUser {
  return maybeCurrentUser.name === 'current user';
}

//------------------------------------------------
// FileId
type FileId = Brand<'FileId', UUID>;
const FileId = z.string().refine(isFileId);
function isFileId(maybeFileId: string): maybeFileId is FileId {
  return isUUID(maybeFileId) && filesById.hasOwnProperty(maybeFileId);
}
// File
const File = z.object({
  id: FileId,
  ownerId: UserId,
  name: z.string(),
  permissionLevel: PermissionLevel,
});
type File = z.infer<typeof File>;
const filesById: Record<FileId, File> = {
  //     ^?
  'bcf0b0a0-0b1e-4b0e-9b0a-9b0a9b0a9b0a': {
    id: 'bcf0b0a0-0b1e-4b0e-9b0a-9b0a9b0a9b0a',
    ownerId: '2fd50c57-b023-4df9-aa8a-d1f2b0191461',
    name: "can view file because it's my own",
    permissionLevel: PermissionLevelEnum.OWNER_ONLY,
  },
  'a0a0939e-feb1-4923-943e-96562240197c': {
    id: 'a0a0939e-feb1-4923-943e-96562240197c',
    ownerId: '5c17178a-d0eb-4dd9-ad99-7bdc9be6d60d',
    name: 'asdf',
    permissionLevel: PermissionLevelEnum.COMPANY_ONLY,
  },
  'a0a0939e-c31e-4848-a2f2-14756b9a9001': {
    id: 'a0a0939e-c31e-4848-a2f2-14756b9a9001',
    ownerId: 'd9ee1fa1-9383-46bf-8931-ccd7da7b8b5e',
    name: 'asdf',
    permissionLevel: PermissionLevelEnum.PUBLIC,
  },
};

//------------------------------------------------
// File Access Control

// Unauthorized
const CurrentUserUnauthorizedFile = z.object({
  currentUser: CurrentUser,
  file: File,
});
type CurrentUserUnauthorizedFile = z.infer<typeof CurrentUserUnauthorizedFile>;
// Authorized
type CurrentUserAuthorizedFileAccess = Brand<
  CurrentUserUnauthorizedFile,
  'AuthorizedFileAccess'
>;
const CurrentUserAuthorizedFileAccess = CurrentUserUnauthorizedFile.refine(
  isCurrentUserAuthorizedForFile
);
function isCurrentUserAuthorizedForFile(
  props: CurrentUserUnauthorizedFile
): props is CurrentUserAuthorizedFileAccess {
  const fileOwnedByCurrentUser = props.file.ownerId === props.currentUser.id;
  const resolvedFileOwner = (usersById as any)[props.file.ownerId] as User;
  const fileInSameCompanyAsCurrentUser =
    resolvedFileOwner &&
    resolvedFileOwner.companyId === props.currentUser.companyId;

  return (
    (props.file.permissionLevel === PermissionLevelEnum.OWNER_ONLY &&
      fileOwnedByCurrentUser) ||
    (props.file.permissionLevel === PermissionLevelEnum.COMPANY_ONLY &&
      fileInSameCompanyAsCurrentUser) ||
    props.file.permissionLevel === PermissionLevelEnum.PUBLIC
  );
}

//------------------------------------------------
// Usage Demo

// Using type gaurds on if statemnts
const maybeCurrentUser: User = (usersById as any)[
  '2fd50c57-b023-4df9-aa8a-d1f2b0191461'
];
if (isCurrentUser(maybeCurrentUser)) {
  const currentUser = maybeCurrentUser;

  const file: File = (filesById as any)['bcf0b0a0-0b1e-4b0e-9b0a-9b0a9b0a9b0a'];
  const currentUserUnauthorizedFile: CurrentUserUnauthorizedFile = {
    currentUser,
    //     ^?
    file,
    //    ^?
  };
  if (isCurrentUserAuthorizedForFile(currentUserUnauthorizedFile)) {
    const currentUserAuthorizedFile = currentUserUnauthorizedFile;
    //          ^?
  }
}

// Using zod to assert
const currentUser = CurrentUser.parse(
  (usersById as any)['2fd50c57-b023-4df9-aa8a-d1f2b0191461']
);
//     ^?
const file = File.parse(
  (filesById as any)['bcf0b0a0-0b1e-4b0e-9b0a-9b0a9b0a9b0a']
);
//     ^?
const currentUserUnauthorizedFile = CurrentUserAuthorizedFileAccess.parse({
  //       ^?
  currentUser,
  file,
});

document.body.innerHTML = JSON.stringify(currentUserUnauthorizedFile);
