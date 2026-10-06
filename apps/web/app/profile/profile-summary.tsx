import type { ReactNode, Ref } from "react";

export function ProfileSummary({
  name,
  bio,
  campus,
  major,
  graduationYear,
  verified,
  headingRef,
  actions,
}: {
  name: string;
  bio: string;
  campus: string;
  major: string;
  graduationYear: number | null;
  verified?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="profile-title-row">
        <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {name}
        </h1>
        {verified && (
          <span className="profile-verified">
            <span aria-hidden="true">✓</span> UNC email verified
          </span>
        )}
      </div>
      <p className="profile-bio">{bio}</p>
      <dl className="profile-facts">
        <div>
          <dt>University</dt>
          <dd>{campus}</dd>
        </div>
        <div>
          <dt>Major</dt>
          <dd>{major}</dd>
        </div>
        <div>
          <dt>Graduation</dt>
          <dd>
            {graduationYear
              ? `Class of ${graduationYear}`
              : "Add your class year"}
          </dd>
        </div>
      </dl>
      {actions && <div className="profile-main-actions">{actions}</div>}
    </>
  );
}
