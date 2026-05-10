import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";
import './userAvatar.css'

function UserAvatar({e}: {e:string}) {

  const avatar = createAvatar(thumbs, {
    seed: e
  });

  const avatarUrl = avatar.toDataUri();

  return (
    <img
      className="participantsElePic"
      src={avatarUrl}
      alt="avatar"
      style={{
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        border: "2px solid black",
      }}
    />
  );
}

export default UserAvatar;