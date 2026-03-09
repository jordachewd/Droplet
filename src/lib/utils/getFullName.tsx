interface UserNameParams {
  firstName?: string | null;
  lastName?: string | null;
  username: string;
}

export default function getFullName({
  firstName,
  lastName,
  username,
}: UserNameParams): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (lastName) {
    return lastName;
  }

  return username || "Y";
}

export function getNameLetters(name: string) {
  const nameParts = name.split(" ");
  return {
    children: `${nameParts[0][0]}${nameParts[1] ? nameParts[1][0] : ""}`,
  };
}
